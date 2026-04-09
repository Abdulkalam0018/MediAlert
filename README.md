# MediAlert

MediAlert is a full-stack medication management app built to help users stay consistent with their treatment plans. It combines medication scheduling, adherence tracking, Google Calendar syncing, push notifications, and a conversational assistant for logging doses in plain language.

## Highlights

- Secure authentication with Clerk
- Add, edit, extend, complete, and delete medications
- Frequency-aware schedules for:
  - Daily
  - Alternate days
  - Every 3 days
  - Weekly
  - Monthly
- Daily track generation with timing-level status updates
- Adherence dashboard with streaks and completion metrics
- Google Calendar integration with persistent sync state
- Firebase Cloud Messaging setup for push notifications
- Gemini-powered health assistant with medication logging actions
- Background jobs for track generation, calendar sync, and proactive alerts

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Clerk React
- Axios
- Firebase Messaging
- Sonner

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- Clerk Express
- Google Calendar API
- Google Gemini API
- node-cron

## Monorepo Structure

```text
MediAlert/
├── backend/    # Express API, MongoDB models, jobs, integrations
├── frontend/   # React + Vite client
└── README.md
```

## Core Features

### 1. Medication Management

Users can create medications with dosage, notes, start and end dates, reminder preferences, and multiple daily timings.

Relevant files:
- [elixir.model.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/models/elixir.model.js)
- [elixir.routes.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/routes/elixir.routes.js)
- [Medications.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/pages/Medication/Medications.jsx)

### 2. Daily Schedule and Adherence

The backend generates daily medication tracks and stores timing-level states such as `pending`, `taken`, `missed`, and `delayed`. The dashboard shows adherence rate, today’s doses, active medications, and streak information.

Relevant files:
- [track.model.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/models/track.model.js)
- [track.controller.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/controllers/track.controller.js)
- [AdherenceStats.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/components/Dashboard/AdherenceStats.jsx)
- [TodaySchedule.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/components/Dashboard/TodaySchedule.jsx)

### 3. Google Calendar Sync

Users can connect Google Calendar, sync medication schedules into calendar events, and disconnect when they want. The dashboard keeps showing the connected state until the user disconnects manually.

Relevant files:
- [google.routes.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/routes/google.routes.js)
- [google.controller.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/controllers/google.controller.js)
- [Calendar.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/components/Calendar/Calendar.jsx)
- [useCalendarStatus.js](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/hooks/useCalendarStatus.js)

### 4. AI Assistant

The assistant can:
- answer schedule and adherence questions
- log medication actions such as taken, missed, or delayed
- avoid giving direct medication-treatment advice

Relevant files:
- [ai.routes.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/routes/ai.routes.js)
- [ai.controller.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/controllers/ai.controller.js)
- [ai.service.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/services/ai.service.js)
- [AIHealthAssistant.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/components/Dashboard/AIHealthAssistant.jsx)

### 5. Push Notifications

The frontend registers Firebase messaging and stores the user’s FCM token so reminder or alert workflows can target that device.

Relevant files:
- [firebase.js](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/notifications/firebase.js)
- [user.controller.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/controllers/user.controller.js)

## Local Development

### Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas or a local MongoDB instance
- Clerk application
- Google Cloud project with Calendar API enabled
- Firebase project for push notifications
- Gemini API key

## Install

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd MediAlert
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

## Environment Variables

### Frontend: `frontend/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_APP_API_URL=http://localhost:8000/api/v1
VITE_CALENDAR_AUTH_REDIRECT=http://localhost:8000/api/v1/google/auth

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### Backend: `backend/.env`

```env
PORT=8000

MONGODB_URI=your_mongodb_connection_string
DB_NAME=medialert

CLERK_SECRET_KEY=your_clerk_secret_key

CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/google/auth/google/callback

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

## Run the App

### Start the backend

From the `backend` folder:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:8000
```

### Start the frontend

From the `frontend` folder:

```bash
npm run dev
```

Frontend typically runs on:

```text
http://localhost:5173
```

## Auth and User Sync Flow

After signing in with Clerk, the frontend uses Clerk tokens for authenticated API calls. The backend sync endpoint creates or updates the app’s MongoDB user record and links it to the Clerk identity.

Relevant files:
- [App.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/App.jsx)
- [axiosInstance.js](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/api/axiosInstance.js)
- [user.routes.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/routes/user.routes.js)
- [user.controller.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/controllers/user.controller.js)

## Background Jobs

The backend starts cron jobs when the server boots:

- Daily track generation at midnight
- Calendar sync every 6 hours
- Proactive alert generation every 15 minutes

Relevant files:
- [track.job.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/jobs/track.job.js)
- [calendar.job.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/jobs/calendar.job.js)
- [alert.job.js](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/src/jobs/alert.job.js)

## API Overview

Base URL:

```text
/api/v1
```

### User

- `GET /users/test`
- `GET /users/sync`
- `GET /users/me`
- `POST /users/fcm-token`

### Medications

- `POST /elixirs/add`
- `GET /elixirs/`
- `PUT /elixirs/update/:id`
- `POST /elixirs/extend/:id`
- `POST /elixirs/toggle/:id`
- `DELETE /elixirs/:id`

### Tracks

- `POST /tracks/sync`
- `GET /tracks/today`
- `GET /tracks/date/:date`
- `GET /tracks/all`
- `GET /tracks/adherence`
- `PATCH /tracks/:id`

### Google Calendar

- `GET /google/auth/:userId`
- `GET /google/auth/google/callback`
- `GET /google/status`
- `POST /google/sync`
- `POST /google/disconnect`
- `POST /google/toggle-sync`

### AI

- `POST /ai/ask`

## Deployment

### Recommended Setup

- Frontend on Vercel
- Backend on Render

This backend is not an ideal fit for Vercel serverless because it uses a long-running Express process and cron jobs.

### Frontend Deployment Notes

Set the frontend root directory to:

```text
frontend
```

Use:

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Production frontend env:

```env
VITE_APP_API_URL=https://your-backend.onrender.com/api/v1
VITE_CALENDAR_AUTH_REDIRECT=https://your-backend.onrender.com/api/v1/google/auth
```

### Backend Deployment Notes

Set the backend root directory to:

```text
backend
```

Use:

```text
Build Command: npm install
Start Command: npm start
```

Production backend env:

```env
CORS_ORIGIN=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/v1/google/auth/google/callback
```

### Google OAuth Setup

In Google Cloud Console, add the following authorized redirect URI:

```text
https://your-backend.onrender.com/api/v1/google/auth/google/callback
```

## Current Routes in the Frontend

- `/` landing page
- `/dashboard` main app dashboard
- `/calendar-sync` Google Calendar management
- `/medication` medication management page

Relevant file:
- [App.jsx](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/src/App.jsx)

## Scripts

### Frontend

From [frontend/package.json](/Users/abdulkalam/Desktop/medialert/MediAlert/frontend/package.json):

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Backend

From [backend/package.json](/Users/abdulkalam/Desktop/medialert/MediAlert/backend/package.json):

- `npm run dev`
- `npm start`

## Known Notes

- Clerk development keys work for development, but production should use production Clerk keys.
- Vite environment variable changes require a rebuild or redeploy.
- Google Calendar OAuth is sensitive to exact callback URL mismatches.
- Push notification support depends on valid Firebase setup and browser permissions.

## Roadmap Ideas

- Better notification delivery analytics
- Stronger reminder scheduling controls
- Richer AI assistant history and context
- Better admin and observability tooling
- E2E tests for auth and OAuth flows

## Team

Built by Team Spartan.

- Abdul Kalam
- Manjeet Kumar
- Govind Saini

## License

MIT
