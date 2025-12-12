import cv2
import numpy as np
import time
from collections import deque

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
    print("✅ MediaPipe loaded successfully!")
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("⚠️  MediaPipe not available, using motion detection mode")

class FinalSquatCounter:
    def __init__(self):
        # Core state
        self.counter = 0
        self.stage = None
        self.last_stage = "UP"
        self.rep_start_time = None
        self.last_rep_time = 0

        # --- TUNING PARAMETERS ---
        # Ready state: User must hold standing pose for ~0.6 seconds
        self.system_ready = False
        self.stable_frames_required = 18 # Hold standing pose for 18 frames
        self.stable_frame_count = 0
        self.min_rep_interval = 1.0  # Minimum time between reps (balanced to allow normal squat pace)

        # Rep detection: Need consecutive frames for stability
        self.consecutive_frames_required = 4  # Balanced value for stability without being too strict
        self.consecutive_down_frames = 0
        self.consecutive_up_frames = 0
        
        # Hysteresis for angle thresholds (prevents rapid toggling)
        self.angle_threshold_up_high = 160  # High threshold when going up
        self.angle_threshold_up_low = 150   # Low threshold when going down
        self.angle_threshold_down_high = 125 # High threshold when going up
        self.angle_threshold_down_low = 105  # Low threshold when going down
        
        # Legacy thresholds for backward compatibility
        self.angle_threshold_up = 155
        self.angle_threshold_down = 115

        # Smoothing: Use mean for responsiveness, moderate buffer size
        self.smoothing_buffer_size = 10  # Increased for smoother detection
        self.left_knee_buffer = deque(maxlen=self.smoothing_buffer_size)
        self.right_knee_buffer = deque(maxlen=self.smoothing_buffer_size)
        self.hip_buffer = deque(maxlen=self.smoothing_buffer_size) # Using average hip angle
        
        # Velocity tracking for movement validation
        self.angle_velocity_buffer = deque(maxlen=5)  # Track angle change rate
        self.min_down_velocity = 6.0  # Minimum angle change per frame to count as intentional movement (balanced to allow real squats while preventing false positives)
        self.max_up_velocity = 25.0  # Maximum angle change - filters out too-fast movements

        # Confidence: MediaPipe detection confidence
        self.min_detection_confidence = 0.65
        self.min_tracking_confidence = 0.65

        # Quality Check (for summary, not displayed in real-time)
        self.quality_depth_threshold = 100 # Angle < 100 for a "good" rep
        self.quality_speed_min = 1.0
        self.quality_speed_max = 5.0
        self.quality_knee_alignment_threshold = 50 # Max pixel difference knee-ankle X

        # Performance metrics
        self.good_reps = 0
        self.bad_reps = 0
        self.avg_speed = 0
        self.speeds = []
        
        # Anti false-positive measures
        self.time_in_up_state = 0  # Track how long in UP state
        self.min_time_in_up_before_rep = 0.5  # Must be UP for 0.5s before starting new rep
        self.last_angle_at_up_state = 180  # Track angle when entering UP state
        self.min_angle_difference_for_rep = 30  # Must have at least 30° difference between UP and DOWN

        # UI
        self.full_screen = False
        self.window_width = 1200
        self.window_height = 800
        self.current_scale = 1.0
        self.font_scale = 1.0
        self.text_thickness = 2

        # Setup based on availability
        if MEDIAPIPE_AVAILABLE:
            self.setup_mediapipe()
        else:
            self.setup_motion_detection()

    def setup_mediapipe(self):
        """Initializes MediaPipe Pose detection."""
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=self.min_detection_confidence,
            min_tracking_confidence=self.min_tracking_confidence
        )
        self.detection_mode = "mediapipe"
        print("Using MediaPipe Pose Detection - FINAL FRONT VIEW SQUATS")

    def setup_motion_detection(self):
        """Initializes Motion Detection fallback."""
        self.background = None
        self.motion_threshold = 7000
        self.last_motion_time = 0
        self.motion_cooldown = 2.5
        self.consecutive_motion_frames = 0
        self.motion_frames_required = 3
        self.detection_mode = "motion"
        print("Using Motion Detection - FINAL FRONT VIEW SQUATS")

    def calculate_angle(self, a, b, c):
        """Calculates the angle between three points."""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
        angle = np.abs(radians*180.0/np.pi)
        if angle > 180.0:
            angle = 360 - angle
        return angle

    def calculate_knee_alignment(self, left_knee, right_knee, left_ankle, right_ankle):
        """Checks if knees are roughly vertically aligned over ankles."""
        left_x_diff = abs(left_knee[0] - left_ankle[0])
        right_x_diff = abs(right_knee[0] - right_ankle[0])
        return left_x_diff < self.quality_knee_alignment_threshold and \
               right_x_diff < self.quality_knee_alignment_threshold

    def smooth_value(self, buffer, new_value):
        """Applies simple averaging smoothing."""
        buffer.append(new_value)
        return np.mean(buffer)

    def detect_squat_quality(self, min_knee_angle_during_rep, knee_alignment_ok, rep_time):
        """Determines if the completed squat met quality criteria."""
        depth_ok = min_knee_angle_during_rep < self.quality_depth_threshold
        form_ok = knee_alignment_ok
        speed_ok = self.quality_speed_min < rep_time < self.quality_speed_max
        return depth_ok and form_ok and speed_ok

    # --- Responsive UI Functions ---
    def update_scale_factors(self, frame_width, frame_height):
        """Adjusts UI scaling based on window size."""
        base_width = 1280
        base_height = 720
        width_scale = frame_width / base_width
        height_scale = frame_height / base_height
        self.current_scale = min(width_scale, height_scale, 1.5) # Cap max scale
        self.font_scale = max(0.5, min(2.0, self.current_scale))
        self.text_thickness = max(1, int(2 * self.current_scale))

    def get_scaled_font_properties(self):
        """Returns scaled font sizes and thicknesses."""
        return {
            'scale_main': self.font_scale * 1.2,
            'scale_large': self.font_scale * 0.9,
            'scale_medium': self.font_scale * 0.7,
            'scale_small': self.font_scale * 0.5,
            'thickness_main': max(2, self.text_thickness + 1),
            'thickness_normal': self.text_thickness,
            'thickness_small': max(1, self.text_thickness - 1)
        }

    def process_mediapipe_frame(self, frame):
        """Processes a single frame using MediaPipe for squat detection."""
        h, w = frame.shape[:2]
        self.update_scale_factors(w, h) # Update scaling first
        font_props = self.get_scaled_font_properties()

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        results = self.pose.process(rgb_frame)
        rgb_frame.flags.writeable = True

        avg_knee_angle = 0
        avg_hip_angle = 0

        try:
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark

                # CRITICAL: Check landmark visibility and confidence to prevent false positives
                # MediaPipe provides visibility (0-1) and presence (0-1) scores
                required_landmarks = [
                    self.mp_pose.PoseLandmark.LEFT_HIP,
                    self.mp_pose.PoseLandmark.RIGHT_HIP,
                    self.mp_pose.PoseLandmark.LEFT_KNEE,
                    self.mp_pose.PoseLandmark.RIGHT_KNEE,
                    self.mp_pose.PoseLandmark.LEFT_ANKLE,
                    self.mp_pose.PoseLandmark.RIGHT_ANKLE,
                    self.mp_pose.PoseLandmark.LEFT_SHOULDER,
                    self.mp_pose.PoseLandmark.RIGHT_SHOULDER,
                ]
                
                # Check if all required landmarks are visible and have good confidence
                min_visibility = 0.3  # Minimum visibility threshold (lowered to allow more detection flexibility)
                all_landmarks_visible = True
                for landmark_idx in required_landmarks:
                    landmark = landmarks[landmark_idx.value]
                    # Check visibility (MediaPipe provides this)
                    if hasattr(landmark, 'visibility') and landmark.visibility < min_visibility:
                        all_landmarks_visible = False
                        break
                    # Check if landmark is within frame bounds (not too far outside)
                    if landmark.x < -0.2 or landmark.x > 1.2 or landmark.y < -0.2 or landmark.y > 1.2:
                        all_landmarks_visible = False
                        break
                
                # If landmarks are not reliable, reset system and skip processing
                if not all_landmarks_visible:
                    if self.system_ready:
                        # Reset if we were ready but landmarks became unreliable
                        self.system_ready = False
                        self.stable_frame_count = 0
                        self.stage = None
                        print("⚠️ Landmarks unreliable - resetting system")
                    # Draw landmarks but don't process counting
                    if self.mp_drawing:
                        self.mp_drawing.draw_landmarks(
                            frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS,
                            self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2),
                            self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                        )
                    return frame

                # Key points
                left_hip = [landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value].x * w, landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value].y * h]
                left_knee = [landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE.value].x * w, landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE.value].y * h]
                left_ankle = [landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE.value].x * w, landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE.value].y * h]
                right_hip = [landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value].x * w, landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value].y * h]
                right_knee = [landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE.value].x * w, landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE.value].y * h]
                right_ankle = [landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE.value].x * w, landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE.value].y * h]
                left_shoulder = [landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * w, landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * h]
                right_shoulder = [landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * w, landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * h]

                # Calculate angles
                left_knee_angle = self.calculate_angle(left_hip, left_knee, left_ankle)
                right_knee_angle = self.calculate_angle(right_hip, right_knee, right_ankle)
                left_hip_angle = self.calculate_angle(left_shoulder, left_hip, left_knee)
                right_hip_angle = self.calculate_angle(right_shoulder, right_hip, right_knee)

                # Smooth average angles
                avg_knee_angle = self.smooth_value(self.left_knee_buffer, (left_knee_angle + right_knee_angle) / 2)
                avg_hip_angle = self.smooth_value(self.hip_buffer, (left_hip_angle + right_hip_angle) / 2)
                
                # Calculate velocity (rate of angle change)
                if len(self.angle_velocity_buffer) == 0:
                    self.angle_velocity_buffer.append(avg_knee_angle)
                else:
                    angle_change = abs(avg_knee_angle - self.angle_velocity_buffer[-1])
                    # Store both current angle and velocity for tracking
                    self.angle_velocity_buffer.append(avg_knee_angle)
                current_velocity = abs(avg_knee_angle - self.angle_velocity_buffer[-2]) if len(self.angle_velocity_buffer) >= 2 else 0

                # Check knee alignment
                knee_alignment_ok = self.calculate_knee_alignment(left_knee, right_knee, left_ankle, right_ankle)

                current_time = time.time()

                # --- READY STATE LOGIC ---
                if not self.system_ready:
                    # Require both knees and hips to be in upright position with stability
                    # Also check that angles are stable (not moving much)
                    current_velocity = abs(avg_knee_angle - self.angle_velocity_buffer[-2]) if len(self.angle_velocity_buffer) >= 2 else 0
                    is_stable = current_velocity < 3.0  # Low velocity = standing still
                    
                    if (avg_knee_angle > self.angle_threshold_up_high and 
                        avg_hip_angle > self.angle_threshold_up_high and
                        knee_alignment_ok and
                        is_stable):  # Must be standing still, not moving
                        self.stable_frame_count = min(self.stable_frame_count + 1, self.stable_frames_required)
                        if self.stable_frame_count >= self.stable_frames_required:
                            self.system_ready = True
                            self.stage = "UP"
                            self.last_stage = "UP"
                            self.last_angle_at_up_state = avg_knee_angle  # Initialize UP angle
                            self.time_in_up_state = self.min_time_in_up_before_rep  # Start with timer ready
                            print("✅ System Ready - Start Squats!")
                    else:
                        # Reset if movement detected or not in correct position
                        self.stable_frame_count = max(0, self.stable_frame_count - 2)  # Decrease faster when not ready

                # --- COUNTING LOGIC (Only if ready) ---
                if self.system_ready:
                    # ADDITIONAL SAFETY: Check if person is still in frame and visible
                    # Reset if angles are extremely unrealistic (likely false positive)
                    # More lenient range to allow deep squats
                    if avg_knee_angle < 30 or avg_knee_angle > 185 or avg_hip_angle < 30 or avg_hip_angle > 185:
                        # Unrealistic angles - likely false detection
                        self.system_ready = False
                        self.stable_frame_count = 0
                        self.stage = None
                        print("⚠️ Unrealistic angles detected - resetting system")
                        if self.mp_drawing:
                            self.mp_drawing.draw_landmarks(
                                frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS,
                                self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2),
                                self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                            )
                        return frame
                    
                    # Calculate current velocity from angle buffer
                    current_velocity = abs(avg_knee_angle - self.angle_velocity_buffer[-2]) if len(self.angle_velocity_buffer) >= 2 else 0
                    
                    # Track time in UP state to prevent rapid false counts
                    if self.stage == "UP":
                        self.time_in_up_state += (1/30)  # Assuming ~30 FPS
                    else:
                        self.time_in_up_state = 0
                    
                    # Determine potential stage with hysteresis
                    is_up = False
                    is_down = False
                    
                    if self.stage == "UP" or self.stage is None:
                        # When in UP or starting, use high threshold to go down
                        is_up = (avg_knee_angle > self.angle_threshold_up_low and 
                                avg_hip_angle > self.angle_threshold_up_low)
                        # Stricter: require significant movement AND must be in UP for minimum time
                        is_down = (avg_knee_angle < self.angle_threshold_down_high and 
                                  avg_hip_angle < self.angle_threshold_down_high and
                                  current_velocity > self.min_down_velocity and
                                  self.time_in_up_state >= self.min_time_in_up_before_rep)  # Must be UP long enough
                    else:  # self.stage == "DOWN"
                        # When in DOWN, use low threshold to come back up
                        is_up = (avg_knee_angle > self.angle_threshold_up_high and 
                                avg_hip_angle > self.angle_threshold_up_high)
                        is_down = (avg_knee_angle < self.angle_threshold_down_low and 
                                  avg_hip_angle < self.angle_threshold_down_low)
                    
                    # Update consecutive frame counters
                    if is_up:
                        self.consecutive_up_frames += 1
                        self.consecutive_down_frames = 0
                        current_stage_potential = "UP"
                    elif is_down:
                        self.consecutive_down_frames += 1
                        self.consecutive_up_frames = 0
                        current_stage_potential = "DOWN"
                    else:
                        # In transition zone - don't change stage immediately
                        self.consecutive_up_frames = max(0, self.consecutive_up_frames - 1)
                        self.consecutive_down_frames = max(0, self.consecutive_down_frames - 1)
                        current_stage_potential = self.stage

                    # Confirm stage change with velocity validation
                    if current_stage_potential == "UP" and self.consecutive_up_frames >= self.consecutive_frames_required:
                        if self.stage == "DOWN":
                            # Validate the rep was complete - must have actually gone down and back up
                            if self.rep_start_time and (current_time - self.last_rep_time) > self.min_rep_interval:
                                # Calculate minimum angle reached during the rep
                                all_knee_angles = list(self.left_knee_buffer) + list(self.right_knee_buffer)
                                min_angle = min(all_knee_angles) if all_knee_angles else avg_knee_angle
                                
                                # STRICT VALIDATION: Only count if:
                                # 1. Minimum depth was reached (actually squatted)
                                # 2. Current position is UP (came back up)
                                # 3. Rep time is reasonable
                                # 4. There was actual movement (velocity check)
                                # 5. Significant angle difference (went from UP to DOWN)
                                rep_time = current_time - self.rep_start_time
                                
                                # Check if we actually squatted (went deep enough)
                                actually_went_down = min_angle < self.angle_threshold_down_low
                                # Check if we're actually back up
                                actually_back_up = avg_knee_angle > self.angle_threshold_up_high and avg_hip_angle > self.angle_threshold_up_high
                                # Check if there was meaningful movement during the rep
                                has_movement = rep_time > 0.5  # At least half a second
                                # Check if we had significant angle change (prevent noise)
                                angle_difference = self.last_angle_at_up_state - min_angle
                                significant_angle_change = angle_difference >= self.min_angle_difference_for_rep
                                
                                if (actually_went_down and actually_back_up and has_movement and 
                                    significant_angle_change and 0.5 < rep_time < 8.0):
                                    self.counter += 1
                                    self.speeds.append(rep_time)
                                    self.avg_speed = np.mean(self.speeds[-10:]) if self.speeds else 0

                                    if self.detect_squat_quality(min_angle, knee_alignment_ok, rep_time):
                                        self.good_reps += 1
                                        print(f"✅ Rep #{self.counter} (Good) - Time: {rep_time:.2f}s, Depth: {min_angle:.1f}°, Change: {angle_difference:.1f}°")
                                    else:
                                        self.bad_reps += 1
                                        print(f"⚠️ Rep #{self.counter} (Bad) - Time: {rep_time:.2f}s, Depth: {min_angle:.1f}°, Change: {angle_difference:.1f}°")
                                    self.last_rep_time = current_time
                                    self.last_angle_at_up_state = avg_knee_angle  # Update for next rep
                                else:
                                    # Reset without counting - false positive prevented
                                    if self.rep_start_time:
                                        print(f"⚠️ False positive prevented - Depth: {min_angle:.1f}°, Up: {actually_back_up}, Time: {rep_time:.2f}s, AngleChange: {angle_difference:.1f}°")
                            self.rep_start_time = None
                            self.time_in_up_state = 0  # Reset timer
                        else:
                            # Just entered UP state - record the angle
                            if self.stage != "UP":
                                self.last_angle_at_up_state = avg_knee_angle
                        self.stage = "UP"

                    elif current_stage_potential == "DOWN" and self.consecutive_down_frames >= self.consecutive_frames_required:
                        # Only start new rep if we were in UP and enough time has passed
                        # ADDITIONAL: Must have been in UP state for minimum time
                        if (self.stage == "UP" and 
                            (current_time - self.last_rep_time) > self.min_rep_interval and
                            self.time_in_up_state >= self.min_time_in_up_before_rep):
                            # STRICT VALIDATION: Only start rep if:
                            # 1. We're actually moving down (velocity check)
                            # 2. Velocity isn't too fast (prevent noise)
                            # 3. We're actually in a DOWN position (angles confirm)
                            # 4. We've been stable in UP position long enough
                            if current_velocity > self.min_down_velocity and current_velocity < self.max_up_velocity:
                                # Additional check: verify we're actually going down (angles decreasing)
                                self.rep_start_time = current_time
                                self.left_knee_buffer.clear()
                                self.right_knee_buffer.clear()
                                self.angle_velocity_buffer.clear()
                                self.last_angle_at_up_state = avg_knee_angle  # Record starting angle
                                print(f"🏋️ Rep #{self.counter + 1} - Going down...")
                                self.stage = "DOWN"
                            else:
                                # Ignore if no actual movement detected
                                pass

                # --- DRAWING ---
                landmark_radius = max(2, int(3 * self.current_scale))
                landmark_thickness = max(1, int(2 * self.current_scale))
                connection_thickness = max(1, int(2 * self.current_scale))

                self.mp_drawing.draw_landmarks(
                    frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(121, 22, 76), thickness=landmark_thickness, circle_radius=landmark_radius),
                    self.mp_drawing.DrawingSpec(color=(245, 117, 66), thickness=connection_thickness, circle_radius=landmark_radius)
                )

                angle_text_size = max(0.3, 0.5 * self.current_scale)
                angle_thickness = max(1, self.text_thickness - 1)
                cv2.putText(frame, str(int(left_knee_angle)), tuple(np.multiply(left_knee, [1, 1]).astype(int)),
                            cv2.FONT_HERSHEY_SIMPLEX, angle_text_size, (255, 255, 0), angle_thickness)
                cv2.putText(frame, str(int(right_knee_angle)), tuple(np.multiply(right_knee, [1, 1]).astype(int)),
                            cv2.FONT_HERSHEY_SIMPLEX, angle_text_size, (255, 255, 0), angle_thickness)

                # Display UI
                self.display_squat_info(frame, avg_knee_angle, avg_hip_angle, knee_alignment_ok, font_props)

            else:
                # --- NO POSE DETECTED ---
                self.system_ready = False
                self.stable_frame_count = 0
                self.stage = None
                cv2.putText(frame, 'NO POSE DETECTED',
                            (int(w * 0.1), int(h * 0.1)),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_main'], (0, 0, 255), font_props['thickness_main'])
                cv2.putText(frame, 'Face camera directly',
                            (int(w * 0.1), int(h * 0.15)),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (255, 255, 255), font_props['thickness_normal'])
                # No call to display_squat_info to prevent overlap

        except Exception as e:
            print(f"Error processing frame: {e}")
            self.display_squat_info(frame, 0, 0, False, font_props) # Show basic UI on error

        return frame

    def display_squat_info(self, frame, knee_angle, hip_angle, knee_alignment_ok, font_props):
        """Displays the UI elements on the frame."""
        h, w = frame.shape[:2]
        line_height = int(h * 0.05) # Relative line height

        # --- Top Left Info Panel ---
        info_x = int(w * 0.02)
        info_y_start = int(h * 0.08)
        current_y = info_y_start

        # Counter
        cv2.putText(frame, f'SQUATS: {self.counter}', (info_x, current_y),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_main'], (0, 255, 0), font_props['thickness_main'])
        current_y += int(line_height * 1.5) # Larger gap after main counter

        # Stage
        cv2.putText(frame, f'STAGE: {self.stage}', (info_x, current_y),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_large'], (255, 255, 255), font_props['thickness_normal'])
        current_y += line_height

        # Angles
        if knee_angle > 0:
            cv2.putText(frame, f'KNEE ANGLE: {int(knee_angle)}', (info_x, current_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (255, 255, 255), font_props['thickness_normal'])
            current_y += line_height
        if hip_angle > 0:
             cv2.putText(frame, f'HIP ANGLE: {int(hip_angle)}', (info_x, current_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (255, 255, 255), font_props['thickness_normal'])
             current_y += line_height

        # Average Speed
        if self.avg_speed > 0:
            cv2.putText(frame, f'AVG SPEED: {self.avg_speed:.2f}s', (info_x, current_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (255, 255, 0), font_props['thickness_normal'])
            current_y += line_height

        # --- System Ready Status ---
        if not self.system_ready:
            cv2.putText(frame, 'GET IN STANDING POSITION', (info_x, current_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (0, 0, 255), font_props['thickness_normal'])
            stability_percent = (self.stable_frame_count / self.stable_frames_required) * 100
            cv2.putText(frame, f'Stabilizing: {int(stability_percent)}%', (info_x, current_y + int(line_height * 0.8)),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_small'], (0, 165, 255), font_props['thickness_small'])
        else:
             cv2.putText(frame, 'READY', (info_x, current_y),
                        cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (0, 255, 0), font_props['thickness_normal'])

        # --- Top Right Info Panel ---
        status_x = int(w * 0.65)
        status_y = int(h * 0.05)

        cv2.putText(frame, 'SQUAT COUNTER', (status_x, status_y),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (0, 255, 255), font_props['thickness_normal'])

        # Form Feedback (Only if ready and in DOWN stage)
        if self.system_ready and self.stage == "DOWN":
            feedback_y = status_y + line_height
            if not knee_alignment_ok:
                cv2.putText(frame, 'TIP: Knees over ankles', (status_x, feedback_y),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_small'], (0, 165, 255), font_props['thickness_small'])
            elif knee_angle > self.angle_threshold_down + 5: # Give buffer
                 cv2.putText(frame, 'TIP: Go deeper', (status_x, feedback_y),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_small'], (0, 165, 255), font_props['thickness_small'])
            elif knee_angle < self.quality_depth_threshold:
                 cv2.putText(frame, 'Good depth!', (status_x, feedback_y),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_small'], (0, 255, 0), font_props['thickness_small'])


    def process_motion_frame(self, frame):
        """Processes a single frame using simple Motion Detection."""
        h, w = frame.shape[:2]
        self.update_scale_factors(w, h) # Update scale
        font_props = self.get_scaled_font_properties()

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (21, 21), 0)

        if self.background is None:
            self.background = blur
            print("Initializing background for motion detection...")
            return frame

        frame_delta = cv2.absdiff(self.background, blur)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        motion_pixels = cv2.countNonZero(thresh)

        self.background = cv2.addWeighted(self.background, 0.95, blur, 0.05, 0)
        current_time = time.time()

        if motion_pixels > self.motion_threshold:
            self.consecutive_motion_frames += 1
        else:
            self.consecutive_motion_frames = 0

        if (self.consecutive_motion_frames >= self.motion_frames_required and
            current_time - self.last_motion_time > self.motion_cooldown):
            self.counter += 1
            self.last_motion_time = current_time
            print(f"Squat #{self.counter} (Motion Detected)")
            self.consecutive_motion_frames = 0

        # Display minimal UI for motion mode
        info_x = int(w * 0.02)
        info_y_start = int(h * 0.08)
        line_height = int(h * 0.06)
        cv2.putText(frame, f'SQUATS: {self.counter}', (info_x, info_y_start),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_main'], (0, 255, 0), font_props['thickness_main'])
        cv2.putText(frame, f'Motion: {motion_pixels}', (info_x, info_y_start + line_height),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_large'], (255, 255, 255), font_props['thickness_normal'])
        cv2.putText(frame, 'MOTION DETECTION MODE', (info_x, info_y_start + 2*line_height),
                    cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (0, 165, 255), font_props['thickness_normal'])

        return frame

    def process_frame(self, frame):
        """Routes frame processing based on detection mode."""
        if self.detection_mode == "mediapipe":
            return self.process_mediapipe_frame(frame)
        else:
            return self.process_motion_frame(frame)

    def toggle_fullscreen(self, window_name):
        """Toggles the display window between fullscreen and normal."""
        self.full_screen = not self.full_screen
        if self.full_screen:
            cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            print("🖥️ Fullscreen mode enabled")
        else:
            cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
            cv2.resizeWindow(window_name, self.window_width, self.window_height) # Resize back
            print("🖥️ Windowed mode enabled")

    def handle_window_resize(self, window_name):
        """Updates internal window dimensions if the window is resized."""
        try:
            # Get current size from the window properties
            rect = cv2.getWindowImageRect(window_name)
            current_width = rect[2]
            current_height = rect[3]

            if current_width > 0 and current_height > 0:
                 # Update only if size has changed significantly
                 if abs(current_width - self.window_width) > 1 or abs(current_height - self.window_height) > 1:
                    self.window_width = current_width
                    self.window_height = current_height
                    # print(f"Window resized to: {self.window_width}x{self.window_height}") # Optional debug
                    return True
        except cv2.error as e:
            # Can happen if window is closed during check
            # print(f"Window resize check error: {e}")
            pass
        return False


    def run(self):
        """Starts the camera capture and processing loop."""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("❌ Error: Could not open camera.")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        window_name = 'Final Squat Counter - Resize Window | F: Fullscreen'
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, self.window_width, self.window_height)

        print("\n" + "=" * 70)
        print("🎯 FINAL SQUAT COUNTER")
        print("=" * 70)
        print("CAMERA: Face camera directly.")
        print("POSITION: Show full body. Stand still to begin.")
        print("\n✅ SETTINGS:")
        print(f"   - Ready Frames: {self.stable_frames_required}")
        print(f"   - UP Angle > {self.angle_threshold_up}° | DOWN Angle < {self.angle_threshold_down}°")
        print(f"   - Consecutive Frames: {self.consecutive_frames_required}")
        print(f"   - Smoothing Buffer: {self.smoothing_buffer_size}")
        print("\n🎮 CONTROLS:")
        print("   - 'q': Quit")
        print("   - 'r': Reset Counter")
        print("   - 'f': Toggle Fullscreen")
        print("   - 's': Save Stats (Print Summary)")
        print("   - Drag window edges to resize")
        print("=" * 70 + "\n")

        start_time = time.time()
        frame_count = 0
        last_resize_check = time.time()

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("❌ Error: Could not read frame.")
                    break

                frame_count += 1
                frame = cv2.flip(frame, 1) # Mirror view

                # Check for window resize periodically
                current_time_check = time.time()
                if current_time_check - last_resize_check > 0.5: # Check every 0.5s
                    resized = self.handle_window_resize(window_name)
                    last_resize_check = current_time_check

                processed_frame = self.process_frame(frame)

                # --- Draw FPS and Instructions (Always Visible) ---
                h, w = processed_frame.shape[:2]
                font_props = self.get_scaled_font_properties() # Get current scale
                fps = frame_count / (time.time() - start_time)
                cv2.putText(processed_frame, f'FPS: {fps:.1f}',
                            (w - int(w * 0.15), int(h * 0.05)),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_medium'], (255, 255, 255), font_props['thickness_normal'])
                cv2.putText(processed_frame, 'Q:Quit R:Reset F:Full S:Save',
                            (int(w * 0.02), h - int(h * 0.03)),
                            cv2.FONT_HERSHEY_SIMPLEX, font_props['scale_small'], (255, 255, 255), font_props['thickness_small'])


                cv2.imshow(window_name, processed_frame)

                # --- Handle Keyboard Input ---
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print("Quitting...")
                    break
                elif key == ord('r'):
                    print("🔄 Counter reset! Get back into standing position.")
                    self.counter = 0
                    self.good_reps = 0
                    self.bad_reps = 0
                    self.speeds.clear()
                    self.avg_speed = 0
                    self.system_ready = False
                    self.stable_frame_count = 0
                    self.stage = None
                    self.left_knee_buffer.clear()
                    self.right_knee_buffer.clear()
                    self.hip_buffer.clear()
                    start_time = time.time()
                    frame_count = 0
                elif key == ord('f'):
                    self.toggle_fullscreen(window_name)
                elif key == ord('s'):
                     print("\n💾 Saving Workout Stats (Printing to Console)...")
                     self.print_summary(time.time() - start_time, frame_count)

        except Exception as e:
            print(f"❌ An error occurred during execution: {e}")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("\nCamera released and windows closed.")
            if key == ord('q'):
                self.print_summary(time.time() - start_time, frame_count)

    def print_summary(self, total_time, total_frames):
        """Prints the workout summary to the console."""
        print("\n" + "=" * 70)
        print("🎉 SQUAT WORKOUT SUMMARY")
        print("=" * 70)
        print(f"⏱️  Total time: {total_time:.1f}s")
        print(f"🏆 Total squats: {self.counter}")
        if self.counter > 0:
            print(f"✅ Good form reps: {self.good_reps}")
            print(f"⚠️  Improvable reps: {self.bad_reps}")
            accuracy = (self.good_reps / self.counter) * 100
            print(f"🎯 Good form rate: {accuracy:.1f}%")
            if self.avg_speed > 0:
                print(f"⚡ Average speed: {self.avg_speed:.2f}s per rep")
        print(f"📈 Total frames processed: {total_frames}")
        print("=" * 70 + "\n")

# --- Main Execution ---
# if __name__ == "__main__":
#     try:
#         squat_counter = FinalSquatCounter()
#         squat_counter.run()
#     except Exception as e:
#         print(f"❌ Failed to start counter: {e}")
#         print("Make sure you have necessary libraries installed:")
#         print("pip install numpy opencv-python mediapipe")