"""Token usage and cost tracking: one JSON line per analysis in usage.jsonl."""

import json
import logging
import os
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel

logger = logging.getLogger("iron_eye.usage")

# USD per million tokens (input, output). Source: Anthropic pricing page.
PRICES_PER_MTOK: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5": (1.00, 5.00),
}


class UsageSummary(BaseModel):
    analyses: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    since: str | None = None


def usage_file() -> Path:
    return Path(os.getenv("USAGE_LOG", "usage.jsonl"))


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    for prefix, (input_price, output_price) in PRICES_PER_MTOK.items():
        if model.startswith(prefix):
            return (input_tokens * input_price + output_tokens * output_price) / 1_000_000
    logger.warning("No price configured for model %s; recording cost as 0", model)
    return 0.0


@dataclass
class UsageRecord:
    lift: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float = field(init=False)
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds"))

    def __post_init__(self) -> None:
        self.cost_usd = round(cost_usd(self.model, self.input_tokens, self.output_tokens), 6)


def record(entry: UsageRecord, path: Path | None = None) -> None:
    target = path or usage_file()
    with target.open("a", encoding="utf-8") as f:
        f.write(json.dumps(asdict(entry)) + "\n")
    logger.info(
        "analysis lift=%s in=%d out=%d cost=$%.4f",
        entry.lift,
        entry.input_tokens,
        entry.output_tokens,
        entry.cost_usd,
    )


def summarize(path: Path | None = None) -> UsageSummary:
    target = path or usage_file()
    summary = UsageSummary()
    if not target.exists():
        return summary
    with target.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            summary.analyses += 1
            summary.input_tokens += row["input_tokens"]
            summary.output_tokens += row["output_tokens"]
            summary.cost_usd += row["cost_usd"]
            summary.since = summary.since or row["timestamp"]
    summary.cost_usd = round(summary.cost_usd, 4)
    return summary
