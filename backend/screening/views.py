"""
Views.

Inline comments tagged `# BUG-FIX #N` cross-reference the README "Bugs Fixed"
section. Tagged `# SECURITY-FIX` for the IDOR (Task A-3).
"""
from __future__ import annotations

import json
import logging

from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai import screen_blocking, screen_streaming
from .ai.client import _result_from_raw  # internal — fine inside the same app
from .models import Application
from .pagination import DashboardPagination
from .serializers import (
    ApplicationListSerializer,
    ApplicationSerializer,
    ScreenCandidateInputSerializer,
)

logger = logging.getLogger(__name__)


class ScreenCandidateView(APIView):
    """
    POST /api/screen/ — run a synchronous screening.

    The streaming variant lives in `ScreenCandidateStreamView` below (C-1).
    """

    # BUG-FIX #1: the original had no `permission_classes`, so DRF would
    # fall back to settings DEFAULT_PERMISSION_CLASSES (often AllowAny in
    # examples). Anyone hitting the endpoint could spend our AI budget.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # BUG-FIX #2: original used `request.data['job_description']` which
        # raises KeyError → uncaught 500. Serializer validates + returns 400.
        serializer = ScreenCandidateInputSerializer(data=request.data)
        serializer.raise_if_not_valid = None  # no-op, just for clarity
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # BUG-FIX #3: original called `openai.ChatCompletion.create(...)` — the
        # legacy <1.0 SDK shape. With openai>=1.0 that AttributeErrors at runtime.
        # BUG-FIX #4: original passed only the resume to the prompt, ignoring
        # the job description entirely. Our prompt uses both.
        # BUG-FIX #5: original had no try/except. A network blip or rate-limit
        # raised a 500 with the OpenAI traceback leaking to the client.
        try:
            result = screen_blocking(
                job_description=data["job_description"],
                resume=data["resume"],
            )
        except Exception as exc:
            logger.exception("AI screening failed")
            return Response(
                {"detail": "AI provider error. Please retry.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # BUG-FIX #6: original stored `score = response.choices[0].message.content`
        # — the WHOLE assistant message — into a CharField(max_length=10).
        # That truncates and stores nonsense. We store the parsed numeric score
        # plus the raw response separately for audit.
        # BUG-FIX #7: original tried to save `resume=...` was missing from the
        # `Application.objects.create(...)` call but the model requires it.
        app = Application.objects.create(
            job_description=data["job_description"],
            resume=data["resume"],
            candidate_name=data.get("candidate_name", ""),
            ai_score=result.score,
            ai_reasons=result.reasons,
            ai_raw_response=result.raw_response,
            ai_provider=settings.AI_PROVIDER,
            ai_model=result.model,
            created_by=request.user,
        )
        return Response(
            ApplicationSerializer(app).data, status=status.HTTP_201_CREATED
        )
        # BUG-FIX #8: original returned HTTP_200_OK on a create. Use 201 Created.


class ScreenCandidateStreamView(APIView):
    """
    POST /api/screen/stream/ — Server-Sent Events.

    Streams `event: token` frames as the model emits text, then a final
    `event: done` frame with the parsed score, reasons, and the persisted
    application id.

    Persistence happens *after* streaming completes — the row appears in the
    dashboard only once we have a parseable result. We chose this over saving
    a placeholder row because half-finished screenings have no business value.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ScreenCandidateInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        user = request.user

        def event_stream():
            buffer = []
            try:
                for token in screen_streaming(
                    job_description=data["job_description"],
                    resume=data["resume"],
                ):
                    buffer.append(token)
                    # SSE frame: event name + data line + blank line
                    payload = json.dumps({"token": token})
                    yield f"event: token\ndata: {payload}\n\n"

                raw = "".join(buffer)
                result = _result_from_raw(raw, settings.OPENAI_MODEL)
                app = Application.objects.create(
                    job_description=data["job_description"],
                    resume=data["resume"],
                    candidate_name=data.get("candidate_name", ""),
                    ai_score=result.score,
                    ai_reasons=result.reasons,
                    ai_raw_response=result.raw_response,
                    ai_provider=settings.AI_PROVIDER,
                    ai_model=result.model,
                    created_by=user,
                )
                done = json.dumps(
                    {
                        "application_id": app.id,
                        "score": float(result.score),
                        "reasons": result.reasons,
                    }
                )
                yield f"event: done\ndata: {done}\n\n"
            except Exception as exc:
                logger.exception("Streaming screening failed")
                err = json.dumps({"detail": str(exc)})
                yield f"event: error\ndata: {err}\n\n"

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        # Disable proxy buffering for SSE (nginx, etc.)
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class ApplicationListView(ListAPIView):
    """
    GET /api/applications/ — paginated list of the *current user's* screenings.

    # SECURITY-FIX (Task A-3): the original returned `Application.objects.all()`
    # to any authenticated user. That's a classic IDOR — Recruiter A could see
    # Recruiter B's screenings, including candidate resumes (PII). The fix is
    # to scope the queryset to the authenticated user. Two layers of defense:
    #   1. `get_queryset` filters by `created_by=request.user`
    #   2. The model has no public list endpoint without this filter.
    # We also drop the resume/JD bodies from the list serializer to minimize
    # accidental leakage if someone reuses the queryset elsewhere.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationListSerializer
    pagination_class = DashboardPagination

    def get_queryset(self):
        # SECURITY-FIX: scope to the requesting user, ALWAYS.
        return Application.objects.filter(created_by=self.request.user)


class ApplicationDetailView(APIView):
    """GET /api/applications/<id>/ — full detail. Same ownership check."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # SECURITY-FIX: filter by created_by here too, OR a user could fetch
        # any application by guessing IDs.
        try:
            app = Application.objects.get(pk=pk, created_by=request.user)
        except Application.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ApplicationSerializer(app).data)
