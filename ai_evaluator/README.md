# MediAlert — AI Evaluator (`ai_evaluator/`)

A **Python agentic system** that uses the **Google Gemini SDK** with **Function Calling** and a **ReAct loop** to answer real health questions by querying the live MediAlert Node.js backend.

---

## Architecture

```
User Question
     │
     ▼
Gemini 2.5 Flash ──── Decides which tool to call
     │
     ▼
Python Tool Executor ─── HTTP GET → Node.js /api/v1/internal/*
     │                                        │
     │                                   MongoDB Query
     │                                        │
     └──── JSON result ◄───────────────────────
     │
     ▼
Gemini 2.5 Flash ──── Generates final answer
     │
     ▼
agent_execution.log  (ms-precision traces for every step)
```

---

## Setup

```bash
# From the ai_evaluator/ directory
pip install google-genai requests python-dotenv
```

---

## Usage

### Single question
```bash
python agent_tracer.py --userId <your_mongodb_userId> --question "Did I take my meds today?"
```

### Interactive mode
```bash
python agent_tracer.py
# Enter userId and question when prompted
```

### Full evaluation suite (3 test cases with quality scores)
```bash
python agent_tracer.py --userId <userId> --eval
```

---

## Tools / Function Declarations

| Tool | Node.js Endpoint | What it returns |
|---|---|---|
| `fetch_user_medications` | `GET /api/v1/internal/medications/:userId` | All active medications |
| `fetch_today_doses` | `GET /api/v1/internal/today/:userId` | Today's dose schedule + status |
| `fetch_adherence_summary` | `GET /api/v1/internal/adherence/:userId` | 7-day adherence % |

All endpoints are protected by `x-internal-key` header (set in `backend/.env` as `INTERNAL_API_KEY`).

---

## Log Output (`agent_execution.log`)

Every run appends:
- Session ID and timestamp
- Exact Gemini model used
- Per-turn latency (ms)
- Tool name + arguments Gemini generated
- HTTP latency to Node.js backend
- Full tool JSON response
- Final answer text
- Total end-to-end latency

Example:
```
2025-09-24 23:10:42.331 | INFO     | SESSION START  | id=20250924_231042_331
2025-09-24 23:10:42.332 | INFO     | QUESTION       | Did I take all my medications today?
2025-09-24 23:10:43.891 | INFO     | Gemini latency | 1559.2ms
2025-09-24 23:10:43.892 | INFO     | TOOL CALLED    | fetch_today_doses
2025-09-24 23:10:43.893 | INFO     | TOOL ARGS      | {"userId": "6630abc..."}
2025-09-24 23:10:43.941 | INFO     | HTTP GET http://localhost:8000/api/v1/internal/today/... → 200 (48.3ms)
2025-09-24 23:10:45.201 | INFO     | FINAL ANSWER   | You have taken 2 out of 3 doses today...
2025-09-24 23:10:45.201 | INFO     | TOTAL LATENCY  | 2869.7ms across 2 turns
```

---

## Design Patterns Demonstrated

| Pattern | Location |
|---|---|
| **ReAct (Agentic)** | Multi-turn `while` loop in `run_agent()` |
| **Function Calling** | `types.FunctionDeclaration` + `types.Tool` |
| **Strategy Pattern** | `execute_tool()` routes by tool name |
| **Observer / Logging** | `logging` module with file + stdout handlers |
| **Evaluation Harness** | `run_evaluation_suite()` with quality scoring |

