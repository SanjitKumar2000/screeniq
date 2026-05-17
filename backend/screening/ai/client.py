"""
AI provider client.

Wraps OpenAI (modern v1 SDK) with both a blocking and a streaming call.
Swapping providers: implement the same two methods against another SDK and
flip `AI_PROVIDER` in settings — call sites don't change.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterator

from django.conf import settings
from openai import OpenAI

from .parser import parse_score
from .prompts import SYSTEM_PROMPT, build_user_prompt, parse_model_json

logger = logging.getLogger(__name__)


@dataclass
class ScreeningResult:
    score: Decimal
    reasons: list[str]
    raw_response: str
    model: str


def _client() -> OpenAI:
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
    )


def screen_blocking(job_description: str, resume: str) -> ScreeningResult:
    """Synchronous call. Used when streaming is not requested."""
    client = _client()
    model = settings.OPENAI_MODEL

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(job_description, resume)},
        ],
        temperature=0.2,  # low — we want consistency, not creativity
        timeout=30,
    )
    raw = resp.choices[0].message.content or ""
    return _result_from_raw(raw, model)


def screen_streaming(job_description: str, resume: str) -> Iterator[str]:
    """
    Yield incremental text chunks from the model. The caller (the SSE view)
    is responsible for framing them as SSE events and for the final parse.
    Streaming JSON is awkward — we stream the raw text, parse once at the end.
    """
    client = _client()
    model = settings.OPENAI_MODEL

    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(job_description, resume)},
        ],
        temperature=0.2,
        stream=True,
        timeout=30,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def _result_from_raw(raw: str, model: str) -> ScreeningResult:
    """
    Parse model output into a ScreeningResult.

    Defensive flow: try JSON first (the happy path). If that fails — which can
    happen with weaker models or odd inputs — fall back to regex extraction
    via `parse_score`, and synthesize a single reason explaining the fallback.
    """
    try:
        data = parse_model_json(raw)
        score_raw = data.get("score", "")
        reasons = data.get("reasons") or []
    except Exception:
        logger.warning("AI returned non-JSON output, falling back to regex parse")
        score_raw = raw
        reasons = ["AI output could not be parsed cleanly; score extracted heuristically."]

    score = parse_score(str(score_raw))
    if score is None:
        # If we still can't find a score, we surface that rather than guess.
        # Better to fail loudly than silently store nonsense.
        raise ValueError(f"Could not extract score from AI response: {raw!r}")

    # Coerce reasons to list[str], clamp to 3
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    reasons = [str(r).strip() for r in reasons if str(r).strip()][:3]

    return ScreeningResult(
        score=score, reasons=reasons, raw_response=raw, model=model
    )
