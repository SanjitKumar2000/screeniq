from django.conf import settings
from django.db import models


class Application(models.Model):
    """
    One screening run = one Application row.

    Note on `ai_score`: the original spec had this as `CharField(max_length=10)`,
    which is a data-modeling bug — scores are numeric, so we lose the ability to
    sort/filter/aggregate, and we have to re-parse on every read. We store the
    *normalized* numeric score here and keep the *raw* model response in
    `ai_raw_response` for auditability. See README → "Bugs Fixed".
    """

    job_description = models.TextField()
    resume = models.TextField()

    # Normalized numeric score in [1, 10]. Null while streaming, set on completion.
    ai_score = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    ai_reasons = models.JSONField(default=list, blank=True)  # list[str]
    ai_raw_response = models.TextField(blank=True, default="")  # for audit
    ai_provider = models.CharField(max_length=32, default="openai")
    ai_model = models.CharField(max_length=64, default="")

    # Optional candidate name (B-2 dashboard requirement)
    candidate_name = models.CharField(max_length=255, blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Dashboard query: WHERE created_by=? ORDER BY created_at DESC
            models.Index(fields=["created_by", "-created_at"]),
        ]

    def __str__(self) -> str:
        name = self.candidate_name or f"#{self.pk}"
        return f"Application({name}, score={self.ai_score})"
