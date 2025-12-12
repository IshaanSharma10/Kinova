# 🧪 How to Test Backend in Live-View

## Quick Verification Steps

### 1. **Check Backend is Running**
```powershell
# Test backend health
curl http://localhost:8000

# Should return: {"status":"Backend running!"}
```

### 2. **Test the Process Frame Endpoint Directly**

Open PowerShell and run:
```powershell
# Create a test image (if you have one) or use this to test the endpoint
$testImage = Get-Content "path\to\test.jpg" -Raw -AsByteStream
$boundary = [System.Guid]::NewGuid().ToString()
$bodyLines = @(
    "--$boundary",
    'Content-Disposition: form-data; name="file"; filename="test.jpg"',
    'Content-Type: image/jpeg',
    "",
    [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($testImage),
    "--$boundary",
    'Content-Disposition: form-data; name="workout_type"',
    "",
    "squats",
    "--$boundary--"
) -join "`r`n"
$bodyBytes = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetBytes($bodyLines)
Invoke-WebRequest -Uri "http://localhost:8000/api/process-frame" -Method POST -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyBytes
```

### 3. **Check Browser Console**

1. Open your app at `http://localhost:5173`
2. Navigate to `/live-view`
3. Open Developer Tools (F12)
4. Go to **Console** tab
5. Look for:
   - ✅ **Success**: No errors, frames being sent
   - ❌ **Errors**: Network errors, CORS issues, or API errors

### 4. **Check Network Tab**

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "process-frame" or "api"
4. Click on a request to see:
   - **Request**: POST to `/api/process-frame`
   - **Response**: Should return JSON with `frame`, `count`, `good_reps`, `bad_reps`
   - **Status**: Should be 200 OK

### 5. **Visual Indicators in Live-View**

When backend is working, you should see:

✅ **Working Signs:**
- Two video windows appear (Live Camera + AI Analysis)
- Stats panel shows numbers updating
- Count increases when you do exercises
- Good/Bad reps tracking updates
- Stage changes (UP/DOWN)

❌ **Not Working Signs:**
- Only one video window (Live Camera only)
- Stats stay at 0
- Console shows errors
- Network requests failing (red in Network tab)

### 6. **Check Backend Logs**

In the PowerShell window where backend is running, you should see:
- Frame processing messages
- MediaPipe initialization
- Rep counting logs (e.g., "✅ Rep #1 (Good)")
- Any error messages

## Common Issues & Solutions

### Issue: "CORS error" or "Network error"
**Solution**: Make sure backend is running on port 8000 and frontend proxy is configured correctly.

### Issue: "500 Internal Server Error"
**Solution**: Check backend logs for Python errors. Might be missing dependencies.

### Issue: Stats don't update
**Solution**: 
1. Check browser console for errors
2. Verify camera permissions granted
3. Check Network tab - requests should be 200 OK
4. Ensure backend counter instances are persistent (should be after our fix)

### Issue: Only Live Camera shows, no AI Analysis
**Solution**: 
1. Check Network tab - see if `/api/process-frame` requests are failing
2. Check backend logs for errors
3. Verify MediaPipe is installed: `pip install mediapipe`

## Manual Backend Test

Test the endpoint directly using curl:

```powershell
# Test with a sample request (requires an actual image file)
$imagePath = "C:\path\to\test-image.jpg"
$fileBytes = [System.IO.File]::ReadAllBytes($imagePath)

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test.jpg`"",
    "Content-Type: image/jpeg",
    "",
    [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes),
    "--$boundary",
    "Content-Disposition: form-data; name=`"workout_type`"",
    "",
    "squats",
    "--$boundary--"
) -join $LF

Invoke-RestMethod -Uri "http://localhost:8000/api/process-frame" `
    -Method POST `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body ([System.Text.Encoding]::GetEncoding('iso-8859-1').GetBytes($bodyLines))
```

## Expected Response Format

```json
{
  "frame": "hex-encoded-image-string",
  "count": 5,
  "stage": "UP",
  "avg_speed": 2.3,
  "good_reps": 4,
  "bad_reps": 1
}
```


