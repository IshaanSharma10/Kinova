# ✅ Verify Backend in Live-View - Quick Guide

## 🎯 Quick Test (30 seconds)

### Step 1: Open Browser Console
1. Start your frontend: `npm run dev` (or `.\start-frontend.ps1`)
2. Open `http://localhost:5173/live-view`
3. Press **F12** to open Developer Tools
4. Click the **Console** tab

### Step 2: Check for Backend Connection
Paste this into the console and press Enter:

```javascript
// Test if backend is reachable
fetch('/api/process-frame', {
  method: 'POST',
  body: new FormData()
})
.then(r => console.log('✅ Backend connected! Status:', r.status))
.catch(e => console.error('❌ Backend error:', e));
```

**Expected Result:**
- ✅ `Backend connected! Status: 400` (400 is OK - it means backend received the request, just needs proper data)
- ❌ Network error = Backend not running or proxy misconfigured

### Step 3: Check Network Tab
1. In Developer Tools, click **Network** tab
2. Select an exercise (Squat/Pushup/Lunge)
3. Grant camera permission
4. Look for requests to `/api/process-frame`
5. Click on one to see:
   - **Status**: Should be `200 OK`
   - **Response**: Should have `count`, `good_reps`, `bad_reps`, `frame`

## 🔍 Detailed Verification

### Visual Signs Backend is Working:

✅ **Working:**
- Two video feeds appear: "Live Camera" + "AI Analysis"
- Stats panel shows numbers (not all zeros)
- Numbers increase as you do exercises
- Stage changes between UP/DOWN
- Good/Bad reps count separately

❌ **Not Working:**
- Only one video feed (Live Camera only)
- Stats stuck at 0
- No "AI Analysis" video
- Console shows red errors
- Network tab shows failed requests (red)

### Backend Logs Check

In the PowerShell window running the backend, you should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ MediaPipe loaded successfully!
Using MediaPipe Pose Detection - FINAL FRONT VIEW SQUATS
```

When processing frames:
```
✅ Rep #1 (Good) - Time: 2.3s, Depth: 95.0°
🏋️ Rep #2 - Going down...
```

## 🐛 Troubleshooting

### Problem: "Network Error" or CORS
**Fix:** 
- Verify backend is running: `curl http://localhost:8000`
- Check vite.config.ts has proxy configured correctly

### Problem: Stats stay at 0
**Fix:**
- Check browser console for errors
- Verify camera permission granted
- Check Network tab - requests should be 200 OK
- Look at backend logs for errors

### Problem: Only Live Camera shows
**Fix:**
- Backend might not be processing frames
- Check Network tab for `/api/process-frame` requests
- Verify MediaPipe is installed: `pip list | findstr mediapipe`

## 🧪 Manual Backend Test

Test the backend directly without frontend:

```powershell
cd backend
python test_endpoint.py
```

This will send a test image and show you the response.

## 📊 Expected Behavior

When backend is working correctly:
1. **Frame Rate**: ~8 FPS (1 frame every 120ms)
2. **Response Time**: < 500ms per frame
3. **Stats Update**: Real-time as you exercise
4. **Video Display**: Processed video shows pose landmarks

## 🔗 Quick Links

- **Backend Health**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Live-View**: http://localhost:5173/live-view


