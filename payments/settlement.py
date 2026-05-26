"""Payout settlement processing for the payments service.

Handles batch settlement of merchant payouts, including retry behavior for
transient processor failures. Changes here move money and are governed by
Arbiter before they can be promoted.
"""

from dataclasses import dataclass


# Maximum attempts before a failed settlement is sent to manual review.
MAX_RETRY_ATTEMPTS = 3

# Seconds to wait between retry attempts.
RETRY_BACKOFF_SECONDS = 30


@dataclass
class Settlement:
    merchant_id: str
    amount_cents: int
    currency: str


def submit_settlement(settlement: Settlement, processor) -> bool:
    """Submit a single settlement to the payment processor.

    Retries on transient failure up to MAX_RETRY_ATTEMPTS, then defers the
    settlement to manual review rather than dropping it.
    """
    attempts = 0
    while attempts < MAX_RETRY_ATTEMPTS:
        result = processor.send(settlement)
        if result.ok:
            return True
        if not result.transient:
            return False
        attempts += 1
    defer_to_manual_review(settlement)
    return False


def defer_to_manual_review(settlement: Settlement) -> None:
    """Queue a settlement that exhausted retries for human reconciliation."""
    review_queue.enqueue(settlement)
