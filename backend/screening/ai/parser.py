"""
Score normalization (Task B-3).

The AI returns inconsistent score formats: "7", "7.3", "Seven", "8/10", "9 out of 10",
or even buried in prose. We normalize to a float in [1, 10] on the BACKEND so the
frontend never has to guess. See README → "B-3: Where to handle normalization".
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Optional

_WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}

_NUMERIC_RE = re.compile(r"(\d+(?:\.\d+)?)")
_FRACTION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:/|out\s+of)\s*10", re.IGNORECASE)


def parse_score(raw: str) -> Optional[Decimal]:
    """
    Return a Decimal in [1, 10], or None if no plausible score was found.

    Strategy (in priority order):
      1. Word number ("seven" → 7)
      2. "X/10" or "X out of 10" pattern (most reliable when present)
      3. First standalone number; clamped to [1, 10]
    """
    if not raw:
        return None
    text = raw.strip().lower()

    # 1. Word number — check first since "seven point three" would otherwise match "3"
    for word, num in _WORD_TO_NUM.items():
        # Word boundary so "nineteen" doesn't match "nine"
        if re.search(rf"\b{word}\b", text):
            return Decimal(num)

    # 2. "X/10" or "X out of 10"
    m = _FRACTION_RE.search(text)
    if m:
        return _clamp(Decimal(m.group(1)))

    # 3. First number anywhere — covers "7", "7.3", "Score: 8.0", etc.
    m = _NUMERIC_RE.search(text)
    if m:
        return _clamp(Decimal(m.group(1)))

    return None


def _clamp(value: Decimal) -> Decimal:
    """Clamp to [1, 10]. AI sometimes returns 0 or 11+ — anchor to nearest bound."""
    if value < 1:
        return Decimal("1")
    if value > 10:
        return Decimal("10")
    return value
