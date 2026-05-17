from django.contrib import admin

from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "candidate_name", "ai_score", "created_by", "created_at")
    list_filter = ("ai_provider", "created_at")
    search_fields = ("candidate_name", "job_description")
    readonly_fields = ("ai_raw_response", "created_at")
