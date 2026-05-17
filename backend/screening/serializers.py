from rest_framework import serializers

from .models import Application


class ScreenCandidateInputSerializer(serializers.Serializer):
    """
    Validates inputs to POST /api/screen/.
    Lengths capped to defend against abuse and keep AI token cost predictable.
    """

    job_description = serializers.CharField(min_length=20, max_length=20_000)
    resume = serializers.CharField(min_length=20, max_length=50_000)
    candidate_name = serializers.CharField(
        required=False, allow_blank=True, max_length=255, default=""
    )


class ApplicationSerializer(serializers.ModelSerializer):
    """Full detail for owner. Used in detail/create responses."""

    class Meta:
        model = Application
        fields = [
            "id",
            "candidate_name",
            "job_description",
            "resume",
            "ai_score",
            "ai_reasons",
            "ai_provider",
            "ai_model",
            "created_at",
        ]
        read_only_fields = fields


class ApplicationListSerializer(serializers.ModelSerializer):
    """Lighter payload for /dashboard table. No resume/JD body — saves bandwidth."""

    class Meta:
        model = Application
        fields = ["id", "candidate_name", "ai_score", "created_at"]
        read_only_fields = fields
