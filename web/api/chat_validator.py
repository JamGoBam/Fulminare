"""Post-stream numeric grounding check for the POP chatbot.

Verifies that numbers stated in the model's response appear in at least
one tool result from the same conversation turn, catching hallucinated figures.
"""
from __future__ import annotations

import re

# Matches: $1,234.56  |  12 days  |  500 units  |  3 SKUs  |  15%
_NUMBER_RE = re.compile(
    r"\$[\d,]+(?:\.\d+)?"
    r"|[\d,]+(?:\.\d+)?\s*(?:days?|units?|SKUs?|%)",
    re.IGNORECASE,
)

# Extracts the bare numeric part (strips units, commas, $)
_DIGITS_RE = re.compile(r"[\d]+(?:\.\d+)?")


def _bare_number(match: str) -> str:
    """Return just the numeric value from a matched token, e.g. '12 days' → '12'."""
    m = _DIGITS_RE.search(match.replace(",", ""))
    return m.group() if m else match


def extract_numbers(text: str) -> set[str]:
    return set(_NUMBER_RE.findall(text))


def validate_response(response_text: str, tool_results: list[str]) -> bool:
    """Return True if every number in response_text appears in at least one tool result.

    Returns True unconditionally when no tools were called (nothing to ground against).
    Comparison is tolerant of unit suffixes and int-vs-float formatting (12 == 12.0).
    """
    if not tool_results:
        return True
    nums = extract_numbers(response_text)
    if not nums:
        return True
    combined = " ".join(tool_results)
    for n in nums:
        bare = _bare_number(n)
        # Accept: exact match OR bare integer/float appears in tool results
        if n not in combined and bare not in combined:
            try:
                val = float(bare)
                # Variants: int, float, rounded to nearest dollar/unit (±1)
                variants = {str(val), str(int(val)) if val == int(val) else bare}
                for delta in (0, 1, -1):
                    variants.add(str(int(round(val)) + delta))
                    variants.add(str(round(val, 2) + delta))
                if not any(v in combined for v in variants):
                    return False
            except ValueError:
                return False
    return True
