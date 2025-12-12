# How to Start the Kinova Application

## Prerequisites

1. **Node.js** (v18 or higher) - for frontend
2. **Python 3.8+** - for backend
3. **npm** or **yarn** - package manager

## Step-by-Step Startup Guide

### 1. Start the Backend Server

Open a terminal/command prompt and navigate to the backend folder:

```powershell
cd backend
```

Install Python dependencies (if not already installed):

```powershell
pip install -r requirements.txt
```

Start the FastAPI backend server:

```powershell
uvicorn main:app --reload --port 8000
```

**Or if you prefer using Python directly:**

```powershell
python -m uvicorn main:app --reload --port 8000
```

The backend will start at: `http://localhost:8000`

**Keep this terminal open!**

### 2. Start the Frontend Development Server

Open a **NEW** terminal/command prompt and navigate to the project root:

```powershell
cd D:\Kinova
```

Install dependencies (if not already installed):

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

The frontend will start at: `http://localhost:8080` (or the port shown in terminal)

### 3. Access the Application

Open your browser and go to:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000 (for testing)

## Quick Start (Both Servers)

If you want to start both servers at once, you can use these commands in separate terminals:

**Terminal 1 (Backend):**
```powershell
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```powershell
npm run dev
```

## Troubleshooting

### Backend Issues:
- **Port 8000 already in use**: Change port with `--port 8001`
- **Module not found**: Run `pip install -r requirements.txt` again
- **MediaPipe errors**: Make sure OpenCV and MediaPipe are installed correctly

### Frontend Issues:
- **Port 8080 already in use**: Vite will automatically use the next available port
- **Dependencies missing**: Run `npm install`
- **Backend connection errors**: Make sure backend is running on port 8000

### WorkoutTracker Backend Connection:
- The frontend proxies `/api/*` requests to your backend
- Make sure the backend is running before using WorkoutTracker
- Check browser console for any API errors

## Testing the Backend

You can test if the backend is running by visiting:
- http://localhost:8000 - Should show `{"status": "Backend running!"}`
- http://localhost:8000/docs - FastAPI automatic API documentation

## Notes

- The frontend uses Vite proxy to forward `/api/*` requests to the backend
- Backend must be running for WorkoutTracker to work
- Both servers support hot-reload, so changes will update automatically




