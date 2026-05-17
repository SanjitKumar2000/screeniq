"""
Tests for the screening endpoint. AI is mocked — we test the view's contract,
not OpenAI's behavior.
"""
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from screening.ai.client import ScreeningResult
from screening.models import Application

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="recruiter", password="pw")


def test_screen_post_validates_input(user):
    client = APIClient()
    client.force_authenticate(user=user)
    # Too short — serializer requires min_length=20
    resp = client.post("/api/screen/", {"job_description": "x", "resume": "y"})
    assert resp.status_code == 400
    assert "job_description" in resp.data
    assert "resume" in resp.data


@patch("screening.views.screen_blocking")
def test_screen_post_creates_application(mock_screen, user):
    mock_screen.return_value = ScreeningResult(
        score=Decimal("8.0"),
        reasons=["Strong Python", "5+ years exp", "Relevant project"],
        raw_response='{"score": 8, "reasons": [...]}',
        model="gpt-4o-mini",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    payload = {
        "job_description": "Senior Python engineer with Django experience required",
        "resume": "10 years of Python and Django, built REST APIs at scale, etc.",
        "candidate_name": "Jane Doe",
    }
    resp = client.post("/api/screen/", payload, format="json")
    assert resp.status_code == 201, resp.data
    assert resp.data["ai_score"] == "8.00"
    assert len(resp.data["ai_reasons"]) == 3
    assert Application.objects.filter(created_by=user).count() == 1


def test_screen_requires_auth():
    resp = APIClient().post("/api/screen/", {})
    assert resp.status_code in (401, 403), (
        "Regression of BUG-FIX #1: screening endpoint reachable without auth"
    )
