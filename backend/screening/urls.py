from django.urls import path

from .views import (
    ApplicationDetailView,
    ApplicationListView,
    ScreenCandidateStreamView,
    ScreenCandidateView,
)

urlpatterns = [
    path("screen/", ScreenCandidateView.as_view(), name="screen"),
    path("screen/stream/", ScreenCandidateStreamView.as_view(), name="screen-stream"),
    path("applications/", ApplicationListView.as_view(), name="applications-list"),
    path("applications/<int:pk>/", ApplicationDetailView.as_view(), name="applications-detail"),
]
