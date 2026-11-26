import json

import pytest
from fastapi.testclient import TestClient

from app import main
from app.claude_client import AnalysisError, parse_result
from app.models import AnalysisResult
from app.usage import UsageRecord, record, summarize

client = TestClient(main.app)
FRAME = "A" * 200  # stand-in for a base64 JPEG

GOOD_REPLY = json.dumps(
    {
        "summary": "Solid depth, knees cave on the way up.",
        "strengths": ["Good depth"],
        "corrections": [
            {"issue": "Knee valgus", "fix": "Push knees out", "priority": "high", "bodyParts": ["femur", "shin"]}
        ],
        "cues": ["Spread the floor"],
    }
)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_analyze_returns_camel_case(monkeypatch):
    async def fake_analyze(frames, lift):
        return parse_result(GOOD_REPLY)

    monkeypatch.setattr(main, "analyze_frames", fake_analyze)
    res = client.post("/api/analyze", json={"lift": "squat", "frames": [FRAME] * 6})

    assert res.status_code == 200
    body = res.json()
    assert "overallScore" not in body
    assert body["summary"].startswith("Solid depth")
    assert body["corrections"][0]["bodyParts"] == ["femur", "shin"]


def test_unsupported_lift_rejected():
    res = client.post("/api/analyze", json={"lift": "bench", "frames": [FRAME] * 6})
    assert res.status_code == 422


def test_too_few_frames_rejected():
    res = client.post("/api/analyze", json={"lift": "squat", "frames": [FRAME]})
    assert res.status_code == 422


def test_analysis_error_becomes_502(monkeypatch):
    async def broken(frames, lift):
        raise AnalysisError("The AI reply was incomplete. Please try again.")

    monkeypatch.setattr(main, "analyze_frames", broken)
    res = client.post("/api/analyze", json={"lift": "deadlift", "frames": [FRAME] * 6})
    assert res.status_code == 502


def test_parse_strips_markdown_fences():
    result = parse_result("```json\n" + GOOD_REPLY + "\n```")
    assert isinstance(result, AnalysisResult)
    assert result.corrections[0].body_parts == ["femur", "shin"]


BAD_REPLIES = [
    "no json here",
    '{"strengths": ["missing summary"]}',
    '{"summary": "x", "corrections": [{"issue": "a", "fix": "b", "bodyParts": ["elbow"]}]}',
]


@pytest.mark.parametrize("bad", BAD_REPLIES)
def test_parse_rejects_bad_replies(bad):
    with pytest.raises(AnalysisError):
        parse_result(bad)


def test_usage_cost_and_summary(tmp_path):
    log = tmp_path / "usage.jsonl"
    entry = UsageRecord(lift="squat", model="claude-haiku-4-5-20251001", input_tokens=6000, output_tokens=500)
    assert entry.cost_usd == pytest.approx(0.0085)

    record(entry, log)
    record(entry, log)
    summary = summarize(log)

    assert summary.analyses == 2
    assert summary.input_tokens == 12000
    assert summary.cost_usd == pytest.approx(0.017)


def test_usage_summary_empty(tmp_path):
    assert summarize(tmp_path / "missing.jsonl").analyses == 0
