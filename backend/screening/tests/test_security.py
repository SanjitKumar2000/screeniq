"""
Tests for Task A-3: IDOR security fix.

Without these tests, a regression that swapped `Application.objects.filter(...)`
back to `Application.objects.all()` would silently re-introduce the data leak.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from screening.models import Application

User = get_user_model()


@pytest.fixture
def two_users_with_apps(db):
    alice = User.objects.create_user(username="alice", password="pw")
    bob = User.objects.create_user(username="bob", password="pw")
    alice_app = Application.objects.create(
        job_description="alice's job",
        resume="alice's candidate resume",
        ai_score=Decimal("7"),
        ai_reasons=["good fit"],
        created_by=alice,
    )
    bob_app = Application.objects.create(
        job_description="bob's job",
        resume="bob's candidate resume",
        ai_score=Decimal("8"),
        ai_reasons=["great fit"],
        created_by=bob,
    )
    return alice, bob, alice_app, bob_app


def _auth(client: APIClient, user):
    client.force_authenticate(user=user)
    return client


def test_list_only_shows_own_applications(two_users_with_apps):
    alice, bob, alice_app, bob_app = two_users_with_apps
    client = _auth(APIClient(), alice)
    resp = client.get("/api/applications/")
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.data["results"]]
    assert alice_app.id in ids
    assert bob_app.id not in ids, "IDOR regression: alice can see bob's applications"


def test_detail_cannot_fetch_other_users_application(two_users_with_apps):
    alice, bob, alice_app, bob_app = two_users_with_apps
    client = _auth(APIClient(), alice)
    resp = client.get(f"/api/applications/{bob_app.id}/")
    assert resp.status_code == 404, (
        "IDOR regression: alice fetched bob's application by guessing the id"
    )


def test_unauthenticated_list_is_rejected(two_users_with_apps):
    resp = APIClient().get("/api/applications/")
    assert resp.status_code in (401, 403)
