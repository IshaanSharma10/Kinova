export type GaitCategory = 'excellent' | 'good' | 'fair' | 'needsAttention';
export type CategoryColor = 'success' | 'primary' | 'warning' | 'purple';

export interface CategorizationResult {
  category: GaitCategory;
  label: string;
  color: CategoryColor;
}

/**
 * Categorizes gait metrics based on clinical ranges
 * Returns category, label, and corresponding color
 */

export function categorizeWalkingSpeed(speed: number | undefined): CategorizationResult {
  if (speed === undefined || speed === null || isNaN(speed)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  if (speed > 1.35) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (speed >= 1.00) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (speed >= 0.60) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizeCadence(cadence: number | undefined): CategorizationResult {
  if (cadence === undefined || cadence === null || isNaN(cadence)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  // According to table: 
  // Excellent (Optimal): 110-120 spm
  // Good (Healthy): 100-110 spm
  // Fair (Acceptable): 80-100 spm
  // Needs Attention (Risk): < 80 or > 135 spm
  // Note: Range 120-135 is not explicitly defined, treating as Fair (between Excellent and Needs Attention)
  if (cadence >= 110 && cadence <= 120) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (cadence >= 100 && cadence < 110) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (cadence >= 80 && cadence < 100) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else if (cadence > 120 && cadence <= 135) {
    // Range not explicitly in table, treating as Fair
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    // Needs Attention: < 80 or > 135
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizeStrideLength(strideLength: number | undefined): CategorizationResult {
  if (strideLength === undefined || strideLength === null || isNaN(strideLength)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  if (strideLength >= 1.35 && strideLength <= 1.55) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (strideLength >= 1.10 && strideLength < 1.35) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (strideLength >= 0.90 && strideLength < 1.10) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizePosturalSway(posturalSway: number | undefined): CategorizationResult {
  if (posturalSway === undefined || posturalSway === null || isNaN(posturalSway)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  if (posturalSway >= 0 && posturalSway <= 2.5) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (posturalSway > 2.5 && posturalSway <= 5.0) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (posturalSway > 5.0 && posturalSway <= 8.0) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizeEquilibriumScore(equilibriumScore: number | undefined): CategorizationResult {
  if (equilibriumScore === undefined || equilibriumScore === null || isNaN(equilibriumScore)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  if (equilibriumScore >= 0.30 && equilibriumScore <= 1.00) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (equilibriumScore >= 0.15 && equilibriumScore < 0.30) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (equilibriumScore >= 0.10 && equilibriumScore < 0.15) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizeStepWidth(stepWidth: number | undefined): CategorizationResult {
  if (stepWidth === undefined || stepWidth === null || isNaN(stepWidth)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  if (stepWidth >= 0.08 && stepWidth <= 0.12) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (stepWidth >= 0.05 && stepWidth <= 0.15) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (stepWidth >= 0.03 && stepWidth <= 0.20) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

export function categorizeKneeForce(kneeForce: number | undefined): CategorizationResult {
  if (kneeForce === undefined || kneeForce === null || isNaN(kneeForce)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  // Note: Assuming kneeForce is in Body Weight (BW) units
  // If it's in Newtons, we need to convert it: BW = force_N / (weight_kg × 9.81)
  if (kneeForce >= 1.1 && kneeForce <= 1.3) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (kneeForce >= 1.0 && kneeForce <= 1.4) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (kneeForce >= 0.8 && kneeForce <= 1.5) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else if (kneeForce < 0.8 || kneeForce > 1.5) {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  } else {
    // Safety fallback
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  }
}

export function categorizeGaitSymmetry(gaitSymmetry: number | undefined): CategorizationResult {
  if (gaitSymmetry === undefined || gaitSymmetry === null || isNaN(gaitSymmetry)) {
    return { category: 'needsAttention', label: 'No Data', color: 'purple' };
  }

  // Assuming gaitSymmetry is already a percentage (0-100)
  if (gaitSymmetry >= 90 && gaitSymmetry <= 100) {
    return { category: 'excellent', label: 'Excellent (Optimal)', color: 'success' };
  } else if (gaitSymmetry >= 80 && gaitSymmetry < 90) {
    return { category: 'good', label: 'Good (Healthy)', color: 'primary' };
  } else if (gaitSymmetry >= 70 && gaitSymmetry < 80) {
    return { category: 'fair', label: 'Fair (Acceptable)', color: 'warning' };
  } else {
    return { category: 'needsAttention', label: 'Needs Attention (Risk)', color: 'purple' };
  }
}

