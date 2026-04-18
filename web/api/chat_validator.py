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


def extract_numbers(text: str) -> set[str]:
    return set(_NUMBER_RE.findall(text))


def validate_response(response_text: str, tool_results: list[str]) -> bool:
    """Return True if every number in response_text appears in at least one tool result.

    Returns True unconditionally when no tools were called (nothing to ground against).
    """
    if not tool_results:
        return True
    nums = extract_numbers(response_text)
    if not nums:
        return True
    combined = " ".join(tool_results)
    return all(n in combined for n in nums)
