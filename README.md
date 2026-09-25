# MediAlert 💊

> **Smart Medication Management & AI-Powered Adherence Tracking**

MediAlert is a full-stack health platform that helps users stay consistent with treatment plans. It combines intelligent scheduling, real-time adherence tracking, Google Calendar sync, Firebase push notifications, a **Gemini-powered AI health assistant**, **offline-first PWA support**, and a **Python agentic evaluator** using ReAct loops and function calling.

---

## ✨ Features

- 🔐 **Secure Auth** — Clerk-powered authentication with JWT session management
- 💊 **Medication Management** — Add, edit, extend, toggle, and delete medications with frequency-aware scheduling (Daily / Alternate Days / Every 3 Days / Weekly / Monthly)
- 📅 **Daily Dose Tracking** — Timing-level status: `pending → taken / missed / delayed`
- 📊 **Adherence Dashboard** — Streaks, completion metrics, real-time stats via WebSocket
- 🗓️ **Google Calendar Sync** — OAuth 2.0 integration with persistent 6-hour background sync
- 🔔 **Push Notifications** — Firebase Cloud Messaging (FCM) with Service Worker support
- 🤖 **Sanji — AI Health Assistant** — Gemini 2.5 Flash with RAG context injection, intent routing via regex, voice input, and TTS
- 📴 **Offline-First PWA** — IndexedDB queue + Background Sync API + Cache API; dose updates saved offline and auto-synced when reconnected
- 📱 **Fully Responsive** — Mobile-first layout optimised for Android & iOS with safe-area support and native-feel bottom sheet modals
- 🐍 **Python AI Evaluator** — ReAct agentic loop with Gemini function calling, ms-precision logging, and evaluation harness

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          MediAlert System                             │
│                                                                      │
│   React Frontend (PWA) ──────────── Express Backend                  │
│   (Vite + Tailwind)      REST + WS  (Node.js)                       │
│         │                               │                            │
│   Service Worker                ┌───────┼────────┐                  │
│   ├── Cache API (offline)       │       │        │                  │
│   ├── IndexedDB queue      MongoDB   Gemini    FCM                   │
│   └── Background Sync      Mongoose  2.5 Flash  Admin SDK           │
│         │                               │                            │
│      Socket.IO ───── Real-time ─────────┘                            │
│                                                                      │
│   Background Jobs (node-cron)                                        │
│   ├── track.job    → midnight reset          (0 0 * * *)             │
│   ├── alert.job    → missed dose checks      (*/15 * * * *)          │
│   └── calendar.job → Google Calendar sync   (0 */6 * * *)           │
│                                                                      │
│   Python AI Evaluator (ai_evaluator/)                                │
│   └── agent_tracer.py → Gemini ReAct loop + function calling        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + Vite | UI framework + dev server |
| Tailwind CSS v4 | Styling |
| React Router | Client-side routing |
| Clerk React | Auth session management |
| Socket.IO Client | Real-time updates |
| Firebase Messaging | Push notification client (FCM) |
| IndexedDB + Background Sync | Offline dose queue |
| Cache API + Service Worker | Offline schedule serving |
| Axios | HTTP client |
| Sonner | Toast notifications |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express 5 | API server |
| MongoDB + Mongoose | Database + ODM |
| Clerk Express | Auth middleware |
| Socket.IO | WebSocket server |
| Google Gemini API | AI health assistant |
| Google Calendar API | Calendar OAuth + event sync |
| Firebase Admin SDK | Push notifications |
| node-cron | Background scheduled jobs |
| Redis *(optional)* | Track query caching |
| RabbitMQ *(optional)* | Async notification queue |

### Python AI Evaluator (`ai_evaluator/`)
| Tool | Purpose |
|---|---|
| `google-genai` | Official Gemini SDK |
| `requests` | HTTP calls to Node.js backend |
| `python-dotenv` | Reads `backend/.env` |
| `logging` | ms-precision trace logs |

---

## 📁 Project Structure

```
MediAlert/
├── frontend/                        # React + Vite PWA client
│   ├── public/
│   │   └── firebase-messaging-sw.js # Service Worker (FCM + Cache + Sync)
│   └── src/
│       ├── components/Dashboard/    # AI assistant, stats, schedule
│       ├── components/Calendar/     # Google Calendar UI
│       ├── pages/                   # Dashboard, Medications, Landing
│       ├── notifications/           # Firebase client SDK
│       ├── utils/offlineQueue.js    # IndexedDB offline dose queue
│       └── socket.js                # Socket.IO client
│
├── backend/                         # Express API
│   └── src/
│       ├── controllers/             # Business logic per feature
│       ├── models/                  # Mongoose schemas (Elixir, Track, User)
│       ├── routes/
│       │   └── internal.routes.js   # Python agent API (API key auth)
│       ├── services/ai.service.js   # Gemini RAG + intent routing
│       ├── jobs/                    # 3 cron jobs
│       ├── socket.js                # Socket.IO singleton
│       └── utils/clerk.js           # notifyRealtimeUser() facade
│
├── ai_evaluator/                    # 🐍 Python AI Agent
│   ├── agent_tracer.py              # ReAct loop + function calling + logging
│   ├── agent_execution.log          # Auto-generated trace log
│   └── README.md                    # Evaluator docs
│
└── README.md
```

---

## 📴 Offline-First (PWA)

MediAlert works even without internet — doses marked offline are queued locally and auto-synced when connectivity returns.

### How it works
```
User taps "Mark Taken" (offline, or the request fails with a network error)
      ↓
Optimistic UI update (instant)
      ↓
Saved to IndexedDB (one entry per dose; a newer status replaces an older one)
      ↓
Schedule reloads overlay queued statuses, so doses don't flip back to "pending"
      ↓
Back online / app reopened / Background Sync wakes the tab
      ↓
Page replays PATCH /api/v1/tracks/:id with a fresh Clerk token
(taken doses keep the time they were actually marked)
      ↓
UI refreshes; doses that no longer exist are reported and dropped
```

The Service Worker never replays requests itself: the API needs a Clerk
session token, which expires within about a minute and can't be refreshed
from a Service Worker.

| Layer | Technology | File |
|---|---|---|
| Offline queue + replay | IndexedDB | `src/utils/offlineQueue.js` |
| Replay triggers | `online` event, app start, SW message | `src/hooks/useOfflineSync.js` |
| App shell + schedule cache | Cache API | `public/firebase-messaging-sw.js` |
| Wake-up when connectivity returns | Background Sync API (Chromium) | `public/firebase-messaging-sw.js` |
| Offline / pending-sync banner | `navigator.onLine` + queue count | `TodaySchedule.jsx` |

---

## 🐍 Python AI Evaluator

A standalone **agentic AI system** that connects to the live Node.js backend using a ReAct loop.

### How it works
1. Takes a natural language health question (e.g. *"Did I take my meds today?"*)
2. Gemini 2.5 Flash decides which **tool to call** using function declarations
3. Python intercepts the tool call → makes a real HTTP request to Node.js → returns JSON
4. Gemini generates a final personalized answer
5. Every step logged to `agent_execution.log` with millisecond-precision

### Tools (Function Declarations)
| Tool | Endpoint | Returns |
|---|---|---|
| `fetch_user_medications` | `GET /api/v1/internal/medications/:userId` | Active medications list |
| `fetch_today_doses` | `GET /api/v1/internal/today/:userId` | Today's dose schedule + status |
| `fetch_adherence_summary` | `GET /api/v1/internal/adherence/:userId` | 7-day adherence % |

### Run it
```bash
pip3 install google-genai requests python-dotenv

# Single question
python3 ai_evaluator/agent_tracer.py --userId <mongoUserId> --question "Did I take my meds today?"

# Full evaluation suite (3 test cases with quality scores)
python3 ai_evaluator/agent_tracer.py --userId <mongoUserId> --eval
```

### Sample Log Output
```
2025-09-24 23:10:42.331 | INFO | SESSION START  | id=20250924_231042
2025-09-24 23:10:42.332 | INFO | QUESTION       | Did I take all my medications today?
2025-09-24 23:10:43.891 | INFO | Gemini latency | 1559.2ms
2025-09-24 23:10:43.892 | INFO | TOOL CALLED    | fetch_today_doses
2025-09-24 23:10:43.941 | INFO | HTTP GET ...   | 200 (48.3ms)
2025-09-24 23:10:45.201 | INFO | FINAL ANSWER   | You've taken 2 out of 3 doses today...
2025-09-24 23:10:45.201 | INFO | TOTAL LATENCY  | 2869.7ms across 2 turns
```

---

## 🎯 Design Patterns

| Pattern | Location | Purpose |
|---|---|---|
| **Repository** | `models/*.model.js` | DB abstraction via Mongoose |
| **Observer** | `socket.js` + React `useEffect` | Real-time UI sync |
| **RAG** | `ai.service.js → buildSanjiPrompt()` | MongoDB context → Gemini |
| **Strategy** | `ai.service.js → ACTION_PATTERNS` | Regex-based intent routing |
| **Singleton** | `socket.js → getIO()` | Shared Socket.IO instance |
| **Scheduler** | `jobs/*.job.js` | Background automation |
| **Facade** | `clerk.js → notifyRealtimeUser()` | Abstracts room resolution + emit |
| **ReAct Agent** | `ai_evaluator/agent_tracer.py` | Reason → Act → Observe loop |
| **Offline Queue** | `offlineQueue.js` + Service Worker | IndexedDB + Background Sync |

---

## ⚙️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas or local MongoDB
- Clerk application
- Google Cloud project (Calendar API enabled)
- Firebase project
- Gemini API key

### Install

```bash
git clone https://github.com/Abdulkalam0018/MediAlert.git
cd MediAlert

cd frontend && npm install
cd ../backend && npm install
pip3 install google-genai requests python-dotenv
```

### Environment Variables

**`frontend/.env`**
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_APP_API_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

**`backend/.env`**
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=medialert
CLERK_SECRET_KEY=your_clerk_secret_key
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/google/auth/google/callback
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
OAUTH_STATE_SECRET=long_random_string        # signs the Google OAuth state
INTERNAL_API_KEY=long_random_string_24plus   # Python agent routes; empty = disabled
APP_TIMEZONE=Asia/Kolkata                    # "today", dose times and cron schedules
```

### Run

```bash
cd backend && npm run dev    # port 8000
cd frontend && npm run dev   # port 5174
```

---

## 🔌 API Reference

Base URL: `/api/v1`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/users/sync` | Clerk | Create/update user in MongoDB |
| GET | `/users/me` | Clerk | Get current user profile |
| POST | `/users/fcm-token` | Clerk | Save FCM push token |
| POST | `/elixirs/add` | Clerk | Add a new medication |
| GET | `/elixirs/` | Clerk | Get all medications |
| PUT | `/elixirs/update/:id` | Clerk | Update a medication |
| DELETE | `/elixirs/:id` | Clerk | Delete a medication |
| GET | `/tracks/today` | Clerk | Today's dose schedule |
| GET | `/tracks/adherence` | Clerk | Adherence statistics |
| PATCH | `/tracks/:id` | Clerk | Mark dose taken/missed/delayed |
| POST | `/google/auth/url` | Clerk | Get a signed Google OAuth consent URL |
| POST | `/ai/ask` | Clerk | Ask the AI assistant |
| GET | `/internal/medications/:userId` | API Key | Python agent — medications |
| GET | `/internal/today/:userId` | API Key | Python agent — today's doses |
| GET | `/internal/adherence/:userId` | API Key | Python agent — adherence |

---

## 🚀 Deployment

| Layer | Platform |
|---|---|
| Frontend | Vercel (`frontend/` root, `npm run build`, output `dist`) |
| Backend | Render (`backend/` root, `npm start`) |

```env
# Frontend
VITE_APP_API_URL=https://your-backend.onrender.com/api/v1

# Backend
CORS_ORIGIN=https://your-frontend.vercel.app
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/v1/google/auth/google/callback
```

---

## 👥 Team

Built by **Team Spartan**

- Abdul Kalam
- Manjeet Kumar
- Govind Saini
- Surya Pratap Singh

---

## 📄 License

MIT
