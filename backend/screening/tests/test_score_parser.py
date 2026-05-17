"""
Tests for the score parser. These are the cheapest, highest-value tests in
the suite: B-3 normalization runs on every screening response, so a regression
here breaks the whole product.
"""
from decimal import Decimal

import pytest

from screening.ai.parser import parse_score


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("7", Decimal("7")),
        ("7.3", Decimal("7.3")),
        ("Seven", Decimal("7")),
        ("seven", Decimal("7")),
        ("8/10", Decimal("8")),
        ("9 out of 10", Decimal("9")),
        ("Score: 6.5", Decimal("6.5")),
        # Clamping
        ("0", Decimal("1")),
        ("11", Decimal("10")),
        ("15.7", Decimal("10")),
        # Junk → None
        ("", None),
        ("no idea", None),
    ],
)
def test_parse_score_variants(raw, expected):
    assert parse_score(raw) == expected


def test_word_boundary_prevents_substring_match():
    """'nineteen' must NOT match 'nine'. Word-boundary regex guards this."""
    # 'nineteen' contains 'nine' as substring; should fall through to numeric
    # (or None since 19 is out of range and there's no numeric anyway).
    assert parse_score("nineteen") is None
