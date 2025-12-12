# 🚀 Kinova - Quick Start Guide

## Starting the Application

### Option 1: Start Both Servers (Recommended)
```powershell
.\start-all.ps1
```
This will open both backend and frontend in separate PowerShell windows.

### Option 2: Start Servers Individually

**Backend Server:**
```powershell
.\start-backend.ps1
```
- Starts FastAPI server on `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`

**Frontend Server:**
```powershell
.\start-frontend.ps1
```
- Starts Vite dev server on `http://localhost:5173`
- Hot reload enabled

## Prerequisites

### Backend Requirements:
- Python 3.8 or higher
- Dependencies will be installed automatically from `backend/requirements.txt`

### Frontend Requirements:
- Node.js 18 or higher
- npm (comes with Node.js)
- Dependencies will be installed automatically from `package.json`

## URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Stopping Servers

Press `Ctrl+C` in each PowerShell window, or simply close the window.

## Troubleshooting

### Backend Issues:
1. Make sure Python is installed and in PATH
2. Check that port 8000 is not in use
3. Verify all dependencies are installed: `pip install -r backend/requirements.txt`

### Frontend Issues:
1. Make sure Node.js is installed: `node --version`
2. Delete `node_modules` and reinstall: `npm install`
3. Check that port 5173 is not in use

## Environment Variables

The backend uses these environment variables (optional):
- `HF_CHATBOT_API_URL` - Hugging Face chatbot API URL
- `HF_CHATBOT_API_TOKEN` - Hugging Face API token

Default values are set in `start-backend.ps1` if not provided.


