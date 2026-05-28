# Intent-OS

Intent-OS is a goal-to-task productivity application. The project currently uses Django REST Framework for the backend, React with Tailwind CSS for the frontend, and supports PostgreSQL through environment-based Django settings.

## Developer Setup Guide

Welcome developers! Here is how to get the project running locally.

### Tech Stack
- **Backend:** Python 3, Django, Django REST Framework, PostgreSQL
- **Frontend:** React 19, Vite, Tailwind CSS v4, Axios, Lucide React

### Backend Setup
1. Navigate to the `backend/` directory.
2. Create and activate a virtual environment: `python -m venv venv` and `source venv/bin/activate` (or `venv\Scripts\activate` on Windows).
3. Install dependencies: `pip install -r requirements.txt`.
4. Run migrations: `python manage.py migrate`.
5. Start the development server: `python manage.py runserver`.
6. API will be available at `http://localhost:8000/api/`.

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`.
3. Start the Vite development server: `npm run dev`.
4. The frontend will be available at `http://localhost:5173/`.

## Developer Progress

### Module 1: Intent Input System
- Added intent creation through the REST API.
- Added frontend form support for capturing an intent title and optional description.
- Added intent listing and selection in the React UI.

### Module 2: Task Management System
- Added task model linked to intents.
- Added task CRUD API endpoints.
- Added filtering tasks by `intent_id`.
- Added frontend task panel for viewing, creating, completing, and deleting tasks for a selected intent.

### Module 3: Task Generation Engine
- Added a separate backend task generation service layer.
- Added rule-based keyword detection for learning, fitness, and exam preparation intents.
- Added automatic task generation when a new intent is created.
- Added duplicate prevention so existing intent tasks are not regenerated unless forced.

### Module 4: Scheduling Engine
- Added scheduling service to automatically distribute tasks across a timeline.
- Added `day_number` and `due_date` fields to the Task model.
- Added `POST /api/intents/{id}/schedule/` to generate due dates for intent tasks.
- Added frontend UI support to trigger schedule generation.

### Module 5: Dashboard System
- Added `DashboardViewSet` to compute progress metrics and statistics.
- Added modern, responsive Dashboard UI with metric cards, today's tasks, upcoming tasks, and intent progress bars.
- Integrated `lucide-react` for polished iconography.
- Refactored frontend navigation to use a sidebar with state-based tab switching.

### Module 9: Notification & Reminder System
- Added `Notification` model to track task reminders, overdue alerts, and daily summaries.
- Created `generate_notifications` Django management command for scheduled generation of alerts.
- Built a global `NotificationPanel` component in React to view, mark read, and clear alerts.
- Integrated notifications directly into the main application layout and as actionable banners on the Dashboard.

## Current API Surface

**Intents & Tasks**
- `GET /api/intents/`
- `POST /api/intents/`
- `GET /api/intents/{id}/`
- `PUT/PATCH /api/intents/{id}/`
- `DELETE /api/intents/{id}/`
- `POST /api/intents/{id}/generate-tasks/`
- `POST /api/intents/{id}/schedule/`

**Tasks (Direct)**
- `GET /api/tasks/`
- `GET /api/tasks/?intent_id={id}`
- `POST /api/tasks/`
- `GET /api/tasks/{id}/`
- `PUT/PATCH /api/tasks/{id}/`
- `DELETE /api/tasks/{id}/`

**Dashboard**
- `GET /api/dashboard/overview/`
- `GET /api/dashboard/today/`
- `GET /api/dashboard/upcoming/`
- `GET /api/dashboard/progress/`
- `GET /api/dashboard/recent/`

## Not Added Yet

- AI-based task generation.
- Authentication and user-specific data separation.
- Production deployment configuration.
