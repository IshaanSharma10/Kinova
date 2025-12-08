# How to Start the Frontend

## Quick Start

Since your backend is already running, start the frontend in a **new PowerShell window**:

### Option 1: Use the Script (Easiest)

```powershell
cd D:\Kinova
.\start-frontend.ps1
```

### Option 2: Manual Start

```powershell
cd D:\Kinova
npm run dev
```

## What to Expect

1. **Frontend will start on:** `http://localhost:8080`
2. **Backend should be on:** `http://localhost:8000`
3. **The frontend proxies API calls** to the backend automatically

## After Starting

1. Open your browser and go to: `http://localhost:8080`
2. You should see your Kinova application
3. Navigate to the Chatbot page
4. The chatbot should now work (if backend has correct environment variables)

## Troubleshooting

### Port 8080 Already in Use

If you get an error about port 8080 being in use:

1. Find what's using it:
   ```powershell
   netstat -ano | findstr :8080
   ```

2. Stop that process, or change the port in `vite.config.ts`

### Frontend Can't Connect to Backend

Make sure:
- Backend is running on `http://localhost:8000`
- Backend has the correct environment variables set
- Check `http://localhost:8000/debug/env` to verify backend config

### Dependencies Not Installed

If you see errors about missing modules:

```powershell
cd D:\Kinova
npm install
```

## Both Servers Running

You should have:
- **Backend:** Running in one terminal on port 8000
- **Frontend:** Running in another terminal on port 8080

Keep both terminals open while developing!

