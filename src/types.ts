// Interface for the individual sensor data within a gait entry
export interface SensorData {
  accX: number;
  accY: number;
  accZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  id: number;
  type: "upper" | "lower"; // Assuming these are the only two possible values
}

// Interface for a single gait data entry, identified by a unique key
// Interface for a single gait data entry, identified by a unique key
export interface GaitDataEntry {
  cadence?: number;
  equilibriumScore?: number;
  frequency?: number;
  gaitSymmetry?: number;
  kneeForce?: number;
  posturalSway?: number;
  stepWidth?: number;
  steps?: number;
  strideLength?: number;
  timestamp?: number;
  walkingSpeed?: number;
  sensors?: number[]; // Array of sensor readings [0, 1, 2, 3, 4, 5, 6, 7]
  _key?: string;
}

// Top-level interface for the entire 'gaitData' node
export interface GaitData {
  [key: string]: GaitDataEntry;
}

// This is the combined interface for all of the data that would be returned
export interface FirebaseRoot {
  gaitData: GaitData;
}