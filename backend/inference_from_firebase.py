import os
import numpy as np
import tensorflow as tf
import firebase_admin
from firebase_admin import credentials, db
import joblib
from typing import List, Dict, Optional

# --- Configuration ---
SERVICE_ACCOUNT_PATH = r"D:\gait analysis\newmodel\gaitanalyzer-c23c7-firebase-adminsdk-fbsvc-1bc946d3a6.json"
DATABASE_URL = 'https://gaitanalyzer-c23c7-default-rtdb.firebaseio.com/'

# Updated paths for improved model
MODEL_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\multiinput_gaitscore_improved.keras"
PREPROC_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\preproc_bundle_improved.pkl"

# Fallback to original model if improved doesn't exist
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\multiinput_gaitscore_clinical.keras"
    PREPROC_PATH = r"C:\Users\noorj\OneDrive\Desktop\unstopsmarthire\preproc_bundle.pkl"
    print(f"[WARN] Improved model not found, using original: {MODEL_PATH}")

FIREBASE_NODE = '/gaitData'

FS = 20
WINDOW_SIZE = 8
STEP_SIZE = 4
TIMESTEPS = 1
RAW_CHANNELS = 48  # 8 sensors * 6 channels
N_PARAMS = 9

# Sensor mapping from Firebase to training order
# Training order: ['L_arm', 'R_arm', 'neck', 'cg', 'L_knee', 'R_knee', 'L_ankle', 'R_ankle']
# Firebase order (from your description):
# Upper: id 0=neck, id 1=cg, id 2=L_arm, id 3=R_arm
# Lower: id 0=L_knee, id 1=R_knee, id 2=L_ankle, id 3=R_ankle
SENSOR_MAPPING = {
    # Upper body sensors
    ('upper', 0): 'neck',      # neck
    ('upper', 1): 'cg',        # center of gravity
    ('upper', 2): 'L_arm',     # left arm
    ('upper', 3): 'R_arm',     # right arm
    # Lower body sensors
    ('lower', 0): 'L_knee',    # left knee
    ('lower', 1): 'R_knee',    # right knee
    ('lower', 2): 'L_ankle',   # left ankle
    ('lower', 3): 'R_ankle',   # right ankle
}

# Training sensor order
TRAINING_SENSOR_ORDER = ['L_arm', 'R_arm', 'neck', 'cg', 'L_knee', 'R_knee', 'L_ankle', 'R_ankle']

# --- Firebase Initialization ---
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {'databaseURL': DATABASE_URL})
    print("[INFO] Firebase initialized successfully")
except Exception as e:
    print(f"[ERROR] Firebase initialization failed: {e}")
    raise

# --- Load model and preprocessing data ---
print(f"[INFO] Loading model from: {MODEL_PATH}")
try:
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    print("[INFO] Model loaded successfully")
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")
    raise

print(f"[INFO] Loading preprocessing data from: {PREPROC_PATH}")
try:
    preproc_data = joblib.load(PREPROC_PATH)
    RAW_CHANNEL_ORDER = preproc_data.get("RAW_CHANNEL_ORDER", [])
    print("[INFO] Preprocessing data loaded successfully")
    if RAW_CHANNEL_ORDER:
        print(f"[INFO] Channel order: {len(RAW_CHANNEL_ORDER)} channels")
except Exception as e:
    print(f"[WARN] Failed to load preprocessing data: {e}")
    print("[INFO] Using default channel order")
    RAW_CHANNEL_ORDER = []
    for sensor in TRAINING_SENSOR_ORDER:
        RAW_CHANNEL_ORDER.extend([
            f"{sensor}_accX", f"{sensor}_accY", f"{sensor}_accZ",
            f"{sensor}_gyroX", f"{sensor}_gyroY", f"{sensor}_gyroZ"
        ])

# ========== FUNCTIONS ==========

def map_sensor_to_training_order(sensors: List[Dict]) -> np.ndarray:
    """
    Map Firebase sensor array to training order.
    
    Firebase format: [
        {"type": "upper", "id": 0, "accX": ..., ...},  # neck
        {"type": "upper", "id": 1, "accX": ..., ...},  # COG
        {"type": "upper", "id": 2, "accX": ..., ...},  # L_arm
        {"type": "upper", "id": 3, "accX": ..., ...},  # R_arm
        {"type": "lower", "id": 0, "accX": ..., ...},  # L_knee
        {"type": "lower", "id": 1, "accX": ..., ...},  # R_knee
        {"type": "lower", "id": 2, "accX": ..., ...},  # L_ankle
        {"type": "lower", "id": 3, "accX": ..., ...},  # R_ankle
    ]
    
    Training order: ['L_arm', 'R_arm', 'neck', 'cg', 'L_knee', 'R_knee', 'L_ankle', 'R_ankle']
    """
    # Create a dictionary to store sensor data by training order
    sensor_dict = {}
    
    for sensor in sensors:
        if not isinstance(sensor, dict):
            continue
        
        sensor_type = sensor.get('type', '').lower()
        sensor_id = sensor.get('id', -1)
        
        # Map to training sensor name
        training_name = SENSOR_MAPPING.get((sensor_type, sensor_id))
        if training_name is None:
            print(f"[WARN] Unknown sensor: type={sensor_type}, id={sensor_id}")
            continue
        
        # Extract 6 channels: accX, accY, accZ, gyroX, gyroY, gyroZ
        sensor_dict[training_name] = [
            float(sensor.get('accX', 0.0)),
            float(sensor.get('accY', 0.0)),
            float(sensor.get('accZ', 0.0)),
            float(sensor.get('gyroX', 0.0)),
            float(sensor.get('gyroY', 0.0)),
            float(sensor.get('gyroZ', 0.0)),
        ]
    
    # Build array in training order
    ordered_data = []
    for sensor_name in TRAINING_SENSOR_ORDER:
        if sensor_name in sensor_dict:
            ordered_data.extend(sensor_dict[sensor_name])
        else:
            # Fill with zeros if sensor missing
            ordered_data.extend([0.0] * 6)
            print(f"[WARN] Missing sensor: {sensor_name}, filling with zeros")
    
    return np.array(ordered_data, dtype=np.float32)


def fetch_data_from_firebase(node: str) -> List[Dict]:
    """Fetch gait data from Firebase and process sensor arrays."""
    ref = db.reference(node)
    data = ref.get()
    
    if not data:
        print(f"[WARN] No data at node {node}")
        return []
    
    samples = []
    
    for session_id, session_data in data.items():
        # Skip non-entry keys (like 'average_scores')
        if not session_id.startswith('-'):
            continue
        
        try:
            sensors = session_data.get('sensors', None)
            
            if sensors is None:
                print(f"[WARN] Session {session_id} has no sensors data")
                continue
            
            # Handle list format (your Firebase structure)
            sensor_array = None
            if isinstance(sensors, list):
                # Expected format: list of sensor objects
                if len(sensors) == 8:
                    sensor_array = map_sensor_to_training_order(sensors)
                else:
                    print(f"[WARN] Session {session_id} has {len(sensors)} sensors, expected 8")
                    continue
            elif isinstance(sensors, dict):
                # Handle dict format (legacy or alternative format)
                sensor_list = []
                for key in sorted(sensors.keys()):
                    sensor_obj = sensors[key]
                    if isinstance(sensor_obj, dict):
                        sensor_list.append(sensor_obj)
                if len(sensor_list) == 8:
                    sensor_array = map_sensor_to_training_order(sensor_list)
                else:
                    print(f"[WARN] Session {session_id} has {len(sensor_list)} sensors in dict format")
                    continue
            else:
                print(f"[WARN] Session {session_id} sensors data is {type(sensors)}, skipping")
                continue
            
            if sensor_array is not None and len(sensor_array) == RAW_CHANNELS:
                samples.append({
                    'session_id': session_id,
                    'raw_sensor_data': sensor_array,
                    'firebase_params': {
                        'cadence': session_data.get('cadence', 0.0),
                        'equilibriumScore': session_data.get('equilibriumScore', 0.0),
                        'frequency': session_data.get('frequency', 0.0),
                        'gaitSymmetry': session_data.get('gaitSymmetry', 0.0),
                        'kneeForce': session_data.get('kneeForce', 0.0),
                        'posturalSway': session_data.get('posturalSway', 0.0),
                        'stepWidth': session_data.get('stepWidth', 0.0),
                        'steps': session_data.get('steps', 0.0),
                        'strideLength': session_data.get('strideLength', 0.0),
                        'walkingSpeed': session_data.get('walkingSpeed', 0.0),
                        'timestamp': session_data.get('timestamp', 0.0),
                    }
                })
            else:
                print(f"[WARN] Session {session_id} sensor array invalid (length: {len(sensor_array) if sensor_array is not None else 0})")
        
        except Exception as e:
            print(f"[ERROR] Error processing session {session_id}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return samples


def dataframe_to_raw_array(sensor_data: np.ndarray) -> np.ndarray:
    """
    Convert sensor data array to raw array format.
    
    Input: sensor_data (48,) - flat array of 8 sensors * 6 channels
    Output: (n_samples, 48) - array where each row is a time step
    """
    if len(sensor_data) != RAW_CHANNELS:
        print(f"[ERROR] Sensor data length {len(sensor_data)} != {RAW_CHANNELS}")
        return np.zeros((0, RAW_CHANNELS), dtype=np.float32)
    
    # For single time step, reshape to (1, 48)
    # If you have multiple time steps, reshape accordingly
    return sensor_data.reshape(1, RAW_CHANNELS).astype(np.float32)


def frame_raw_windows_np(raw_np: np.ndarray, window_size: int, step: int) -> np.ndarray:
    """Create sliding windows from raw data (same as training)."""
    if raw_np.shape[0] < window_size:
        return np.zeros((0, window_size, raw_np.shape[1]), dtype=np.float32)
    x = tf.convert_to_tensor(raw_np, dtype=tf.float32)
    w = tf.signal.frame(x, frame_length=window_size, frame_step=step, axis=0)
    return w.numpy().astype(np.float32)


def gait_params_from_imu_windows(raw_windows: np.ndarray) -> np.ndarray:
    """Compute gait parameters from IMU windows (same as training)."""
    if raw_windows.shape[0] == 0:
        return np.zeros((0, N_PARAMS), dtype=np.float32)
    
    x = tf.convert_to_tensor(raw_windows, dtype=tf.float32)
    
    # Channel indices - try to find by name; fallback to defaults
    try:
        idx_CAz = RAW_CHANNEL_ORDER.index('cg_accZ')
        idx_CAx = RAW_CHANNEL_ORDER.index('cg_accX')
        idx_CAy = RAW_CHANNEL_ORDER.index('cg_accY')
        idx_LAx = RAW_CHANNEL_ORDER.index('L_arm_accX')
        idx_RAx = RAW_CHANNEL_ORDER.index('R_arm_accX')
    except (ValueError, AttributeError):
        # Fallback indices (cg is 4th sensor, L_arm is 1st sensor)
        idx_CAz, idx_CAx, idx_CAy = 18, 16, 17  # cg channels (sensor index 3 * 6 + offset)
        idx_LAx, idx_RAx = 0, 6  # L_arm and R_arm accX
    
    vert = x[:, :, idx_CAz]
    diff = vert[:, 1:] - vert[:, :-1]
    batch_size = tf.shape(vert)[0]
    zeros_col = tf.zeros((batch_size, 1), tf.int32)
    peak_vals = tf.cast((diff[:, :-1] > 0) & (diff[:, 1:] <= 0), tf.int32)
    peaks = tf.concat([zeros_col, peak_vals], axis=1)
    n_steps = tf.reduce_sum(peaks, axis=1)
    
    duration = tf.cast(WINDOW_SIZE / FS, tf.float32)
    cadence = tf.where(
        duration > 0,
        tf.cast(n_steps, tf.float32) / duration * 60.0,
        tf.zeros_like(tf.cast(n_steps, tf.float32))
    )
    step_time = tf.where(
        n_steps > 0,
        duration / tf.cast(tf.maximum(n_steps, 1), tf.float32),
        tf.zeros_like(cadence)
    )
    stride_time = 2.0 * step_time
    
    sway_ml = tf.math.reduce_std(x[:, :, idx_CAx], axis=1)
    sway_ap = tf.math.reduce_std(x[:, :, idx_CAy], axis=1)
    mag = tf.norm(
        tf.stack([x[:, :, idx_CAx], x[:, :, idx_CAy], x[:, :, idx_CAz]], axis=2),
        axis=2
    )
    accel_mag_std = tf.math.reduce_std(mag, axis=1)
    step_width_proxy = tf.reduce_mean(tf.abs(x[:, :, idx_LAx] - x[:, :, idx_RAx]), axis=1)
    
    equilibrium_score = tf.zeros_like(cadence)
    gait_cycle_phase_mean = tf.zeros_like(cadence)
    steps = tf.cast(n_steps, tf.float32)
    stride_length = tf.zeros_like(cadence)
    walking_speed = tf.zeros_like(cadence)
    
    gp = tf.stack([
        cadence,
        equilibrium_score,
        gait_cycle_phase_mean,
        sway_ml,
        step_width_proxy,
        steps,
        stride_length,
        walking_speed,
        accel_mag_std
    ], axis=1)
    
    return gp.numpy().astype(np.float32)


def make_sequences_from_windows(raw_windows: np.ndarray,
                                gait_params: np.ndarray,
                                timesteps: int):
    """Create sequences from windows (same as training)."""
    n_windows = raw_windows.shape[0]
    n_sequences = n_windows // timesteps
    
    if n_sequences == 0:
        return (np.zeros((0, timesteps, WINDOW_SIZE, RAW_CHANNELS), dtype=np.float32),
                np.zeros((0, timesteps, N_PARAMS), dtype=np.float32))
    
    n_use = n_sequences * timesteps
    raw_seq = raw_windows[:n_use].reshape(n_sequences, timesteps, WINDOW_SIZE, RAW_CHANNELS)
    params_seq = gait_params[:n_use].reshape(n_sequences, timesteps, N_PARAMS)
    
    return raw_seq.astype(np.float32), params_seq.astype(np.float32)


def classify_gait_score(score: float) -> str:
    """Classify gait score into categories."""
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 40:
        return "Moderately Healthy"
    else:
        return "Needs Improvement"


def update_firebase_avg_score(avg_score: float, classification: str):
    """Update Firebase with average gait score."""
    from datetime import datetime
    ref = db.reference(f"{FIREBASE_NODE}/average_scores")
    ref.update({
        'avgGaitScoreLast20': float(avg_score),
        'avgClassificationLast20': classification,
        'updatedAt': datetime.now().isoformat()
    })
    print(f"[INFO] Updated Firebase with average gait score {avg_score:.3f} and classification '{classification}'")


def run_inference():
    """Main inference function."""
    print("\n" + "="*60)
    print("GAIT SCORE INFERENCE FROM FIREBASE")
    print("="*60)
    
    print(f"\n[INFO] Fetching data from Firebase node: {FIREBASE_NODE}")
    samples = fetch_data_from_firebase(FIREBASE_NODE)
    
    if not samples:
        print("[WARN] No data available for inference.")
        return
    
    total_sessions = len(samples)
    print(f"[INFO] Total sessions fetched: {total_sessions}")
    
    recent_scores = []
    processed_count = 0
    
    for idx, sample in enumerate(samples):
        try:
            session_id = sample['session_id']
            print(f"\n[INFO] Processing sample {idx + 1}/{total_sessions} (Session: {session_id})")
            
            # Get sensor data (already in correct order)
            sensor_array = sample['raw_sensor_data']
            
            # Convert to raw array format
            # Note: For real-time inference, you might have multiple time steps
            # For now, we'll create a single window from the sensor data
            raw_array = sensor_array.reshape(1, RAW_CHANNELS)
            
            print(f"[INFO] Raw array shape: {raw_array.shape}")
            
            # Need multiple time steps to create windows
            # For single time step, we'll pad/repeat to create a window
            if raw_array.shape[0] < WINDOW_SIZE:
                # Repeat the single time step to create a window
                repeated = np.repeat(raw_array, WINDOW_SIZE, axis=0)
                raw_array = repeated
                print(f"[INFO] Repeated single time step to create window of size {WINDOW_SIZE}")
            
            # Create windows
            raw_windows = frame_raw_windows_np(raw_array, WINDOW_SIZE, STEP_SIZE)
            
            if raw_windows.shape[0] == 0:
                print("[WARN] No windows created, skipping sample.")
                continue
            
            print(f"[INFO] Created {raw_windows.shape[0]} windows")
            
            # Compute gait params from IMU windows
            params_from_windows = gait_params_from_imu_windows(raw_windows)
            print(f"[INFO] Computed gait params shape: {params_from_windows.shape}")
            
            # Create sequences
            raw_seq, params_seq = make_sequences_from_windows(
                raw_windows, params_from_windows, TIMESTEPS
            )
            
            print(f"[INFO] Sequences - raw_seq: {raw_seq.shape}, params_seq: {params_seq.shape}")
            
            if raw_seq.shape[0] == 0:
                print("[WARN] No sequences created, skipping sample.")
                continue
            
            # Run inference
            print("[INFO] Running model inference...")
            predictions = model.predict(
                {'raw_in': raw_seq, 'params_in': params_seq},
                verbose=0
            )
            
            # Handle both single and multi-output models
            if isinstance(predictions, list):
                gait_scores = predictions[0].flatten()
                class_probs = predictions[1].flatten() if len(predictions) > 1 else None
            else:
                gait_scores = predictions.flatten()
                class_probs = None
            
            # Clamp scores to valid range
            gait_scores = np.clip(gait_scores, 0.0, 100.0)
            avg_gait_score = float(np.mean(gait_scores))
            
            classification = classify_gait_score(avg_gait_score)
            recent_scores.append(avg_gait_score)
            processed_count += 1
            
            print(f"[INFO] Session: {session_id}")
            print(f"  Gait Score: {avg_gait_score:.3f}")
            print(f"  Classification: {classification}")
            if class_probs is not None:
                print(f"  Class Probability: {class_probs[0]:.3f}")
        
        except Exception as e:
            print(f"[ERROR] Error processing sample {idx + 1}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print("\n" + "="*60)
    print(f"[INFO] Processed {processed_count}/{total_sessions} sessions successfully")
    
    # Update Firebase with average of last 20 sessions
    if len(recent_scores) >= 20:
        last_20_scores = recent_scores[-20:]
        overall_avg_score = float(np.mean(last_20_scores))
        classification = classify_gait_score(overall_avg_score)
        
        print(f"\n[INFO] Average gait score for last 20 sessions: {overall_avg_score:.3f}")
        print(f"[INFO] Classification: {classification}")
        
        update_firebase_avg_score(overall_avg_score, classification)
    elif len(recent_scores) > 0:
        overall_avg_score = float(np.mean(recent_scores))
        classification = classify_gait_score(overall_avg_score)
        
        print(f"\n[INFO] Average gait score for {len(recent_scores)} sessions: {overall_avg_score:.3f}")
        print(f"[INFO] Classification: {classification}")
        print(f"[INFO] Note: Less than 20 sessions, not updating Firebase average")
    else:
        print("\n[WARN] No valid scores computed, skipping Firebase update")


if __name__ == "__main__":
    run_inference()

