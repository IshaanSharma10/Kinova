# Firebase Inference Script Improvements

## Changes Made

### 1. **Fixed Sensor Data Processing**
- **Problem**: Original script only handled 6 channels, but you have 8 sensors (48 channels total)
- **Solution**: Added `map_sensor_to_training_order()` function that properly maps Firebase sensor array to training order
- **Mapping**: Correctly maps upper/lower sensors with IDs to training sensor names:
  - Upper: id 0→neck, id 1→COG, id 2→L_arm, id 3→R_arm
  - Lower: id 0→L_knee, id 1→R_knee, id 2→L_ankle, id 3→R_ankle

### 2. **Improved Model Path Handling**
- **Auto-detection**: Script automatically tries improved model first, falls back to original
- **Paths**: 
  - Primary: `multiinput_gaitscore_improved.keras`
  - Fallback: `multiinput_gaitscore_clinical.keras`

### 3. **Better Error Handling**
- Added try-catch blocks with detailed error messages
- Graceful handling of missing sensors (fills with zeros)
- Better logging for debugging

### 4. **Fixed Code Issues**
- Fixed `__name__ == '__main__'` typo (was `_name_ == '_main_'`)
- Improved Firebase timestamp handling
- Better session filtering (skips non-entry keys)

### 5. **Enhanced Logging**
- Detailed progress messages
- Shows shapes at each processing step
- Better error reporting with stack traces

### 6. **Improved Data Validation**
- Validates sensor array length (must be 48 channels)
- Checks for 8 sensors in Firebase data
- Handles both list and dict sensor formats

## Key Functions

### `map_sensor_to_training_order(sensors)`
Maps Firebase sensor array format to training order:
```python
# Input: Firebase format (list of 8 sensor dicts)
# Output: numpy array (48,) in training order
```

### `fetch_data_from_firebase(node)`
Fetches and processes Firebase data:
- Handles list format: `sensors: [{type, id, accX, ...}, ...]`
- Handles dict format: `sensors: {0: {...}, 1: {...}, ...}`
- Filters out non-entry keys
- Validates sensor count (must be 8)

### `dataframe_to_raw_array(sensor_data)`
Converts sensor array to raw format:
- Input: (48,) array
- Output: (1, 48) array for single time step
- Handles window creation for inference

## Usage

### Run the inference script:
```bash
cd backend
python inference_from_firebase.py
```

### Expected Output:
```
============================================================
GAIT SCORE INFERENCE FROM FIREBASE
============================================================

[INFO] Loading model from: ...
[INFO] Model loaded successfully
[INFO] Fetching data from Firebase node: /gaitData
[INFO] Total sessions fetched: X

[INFO] Processing sample 1/X (Session: -xxx)
[INFO] Raw array shape: (1, 48)
[INFO] Created N windows
[INFO] Computed gait params shape: (N, 9)
[INFO] Sequences - raw_seq: (M, 1, 8, 48), params_seq: (M, 1, 9)
[INFO] Running model inference...
[INFO] Session: -xxx
  Gait Score: XX.XXX
  Classification: Good/Excellent/etc.

[INFO] Updated Firebase with average gait score XX.XXX
```

## Configuration

Edit these at the top of `inference_from_firebase.py`:

```python
SERVICE_ACCOUNT_PATH = r"D:\gait analysis\newmodel\gaitanalyzer-c23c7-firebase-adminsdk-fbsvc-1bc946d3a6.json"
DATABASE_URL = 'https://gaitanalyzer-c23c7-default-rtdb.firebaseio.com/'
MODEL_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\multiinput_gaitscore_improved.keras"
PREPROC_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\preproc_bundle_improved.pkl"
FIREBASE_NODE = '/gaitData'
```

## Firebase Data Format Expected

Your Firebase data should have this structure:
```json
{
  "gaitData": {
    "-Ofnwmf8noCL7TkNSQ6x": {
      "sensors": [
        {"type": "upper", "id": 0, "accX": ..., "accY": ..., "accZ": ..., "gyroX": ..., "gyroY": ..., "gyroZ": ...},  // neck
        {"type": "upper", "id": 1, ...},  // COG
        {"type": "upper", "id": 2, ...},  // L_arm
        {"type": "upper", "id": 3, ...},  // R_arm
        {"type": "lower", "id": 0, ...},  // L_knee
        {"type": "lower", "id": 1, ...},  // R_knee
        {"type": "lower", "id": 2, ...},  // L_ankle
        {"type": "lower", "id": 3, ...}   // R_ankle
      ],
      "cadence": 7.453218,
      "equilibriumScore": 0.935259,
      "posturalSway": 0.069223,
      ...
    }
  }
}
```

## Troubleshooting

### "No data at node /gaitData"
- Check Firebase connection
- Verify SERVICE_ACCOUNT_PATH is correct
- Check DATABASE_URL matches your Firebase project

### "Unknown sensor: type=..., id=..."
- Verify sensor type is exactly "upper" or "lower" (case-insensitive)
- Check sensor IDs are 0-3 for each type
- Ensure all 8 sensors are present

### "Sensor array invalid (length: X)"
- Should be exactly 48 channels (8 sensors × 6 channels)
- Check sensor data extraction logic
- Verify all sensors have accX/Y/Z and gyroX/Y/Z

### "No windows created"
- Need at least WINDOW_SIZE (8) time steps
- For single time step, script repeats data to create window
- Check raw_array shape before windowing

### Model prediction issues
- Ensure model path is correct
- Check preprocessing bundle matches model
- Verify RAW_CHANNEL_ORDER matches training

## Integration with Improved Model

The script automatically:
1. Tries to load improved model first
2. Falls back to original model if improved not found
3. Uses improved preprocessing bundle if available
4. Handles both model architectures

## Next Steps

1. **Test the script** with your Firebase data
2. **Verify sensor mapping** - check logs to ensure sensors are mapped correctly
3. **Monitor predictions** - ensure scores are in expected range (0-100)
4. **Set up scheduling** - run inference periodically (cron job, scheduled task, etc.)


