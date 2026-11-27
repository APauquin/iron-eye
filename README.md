# Iron Eye

AI form coach for barbell lifts. Film a squat or deadlift, trim it to one rep, and Iron Eye tracks every frame to measure **bar speed, bar path and lift phases** locally, at no AI cost. An AI coach then adds a summary, prioritized corrections and cues, with a pose skeleton drawn over key frames.

## How it works

```
Browser (React + TypeScript)                  Server (Python + FastAPI)
────────────────────────────                  ─────────────────────────
pick lift → upload → trim clip
MediaPipe pose on every frame (30/s)
POST /api/motion { poses, height }  ───────▶  numpy: bar path, speed, phases,
                                              sticking point, drift  (no AI)
POST /api/analyze { 6 key frames }  ───────▶  Claude vision coach notes,
                                              usage + cost logged
render metrics, charts, coach notes ◀───────  JSON results
```

**Measuring without AI.** The pose model finds 33 body landmarks per frame in the browser. The server
treats the wrist on the camera side as the bar, fills detection gaps, smooths the track, and converts
pixels to metres using the lifter's height (standing eye-to-heel distance ≈ 93.6% of stature). From
that it derives vertical velocity, the up/down phases (resting pauses excluded), mean and peak
concentric velocity, the sticking point, range of motion and horizontal bar drift.

The Anthropic API key and the coaching prompt live only on the server, never in the browser.

## Stack

- **Frontend:** React 19, TypeScript, Vite, MediaPipe Pose Landmarker
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, numpy, Anthropic SDK
- **Quality:** pytest, ruff, mypy (strict), ESLint, TypeScript strict mode
- **Model:** Claude Haiku 4.5, roughly $0.01 per analysis

## Project layout

```
src/
  IronEye.tsx          app flow and state
  screens/             Select, Upload, Analysing, Results
  components/          VideoTrimmer, SkeletonOverlay, Modal, ...
  lib/                 full-clip pose capture, API client, chart helpers
  config/lifts.ts      lift definitions, filming guidelines, limits
server/
  app/main.py          FastAPI routes
  app/claude_client.py Claude call and reply parsing
  app/models.py        request/response schemas
  app/prompts.py       coaching prompt
  app/motion.py        bar path, speed and phase analysis (numpy, no AI)
  app/usage.py         token and cost tracking
  tests/
```

## Run locally

Requires Node 22.13+ and Python 3.11+.

**Backend** (first terminal):

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # add your Anthropic key
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

**Frontend** (second terminal, project root):

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend.

## Usage and cost tracking

Every analysis is appended to `server/usage.jsonl` with its token counts and estimated cost, and logged in the server terminal. Running totals:

```bash
curl http://localhost:8000/api/usage
```

## Checks

```bash
# backend
cd server && ruff check . && ruff format --check . && mypy app && pytest

# frontend
npm run lint && npm run typecheck && npm run build
```

## Status

| Lift | Status |
| --- | --- |
| Squat | Working |
| Deadlift | Working |
| Bench press | Planned |
| Overhead press | Planned |

## Roadmap

- [x] Bar speed, bar path and lift phases from every frame, computed locally
- [ ] Frame-by-frame player with the skeleton and bar path drawn over the video
- [ ] Camera-angle detection with warnings when a view can't judge something
- [ ] Joint angles (hip, knee, back) at each phase
- [ ] Send the measurements to the AI coach (and fewer, smaller frames)
- [ ] Plate tracking with OpenCV for a more exact bar path
- [ ] Dockerfile and deployment
- [ ] Bench press and overhead press
- [ ] Mobile builds with Capacitor
