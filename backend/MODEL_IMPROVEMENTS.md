# Neural Network Model Improvements

## Problem Identified
The original model was stuck predicting scores in the narrow range of 48-50 due to:
1. **Severe class imbalance**: Most training data (HuGaDB, OU-ISIR) had score=0, only clinical data had real scores
2. **Loss function imbalance**: Dual loss (MSE + binary crossentropy) wasn't prioritizing score prediction
3. **No sample weighting**: Model treated all samples equally despite imbalance
4. **Limited labeled data**: Only clinical data had meaningful scores

## Solutions Implemented

### 1. **Class Imbalance Fix**
- **Option to train only on clinical data**: `TRAIN_ONLY_CLINICAL = True`
  - Removes zero-score data that was biasing the model
  - Focuses learning on actual labeled examples
  
- **Sample weighting**: `USE_SAMPLE_WEIGHTING = True`
  - Non-zero scores get 10x weight (configurable via `NON_ZERO_WEIGHT`)
  - Forces model to pay more attention to labeled data

### 2. **Improved Loss Function**
- **Weighted MSE Loss**: Custom loss that penalizes non-zero predictions more
- **Loss weights**: Prioritize regression (2.0) over classification (0.5)
- **WeightedMSELoss class**: Automatically applies higher weight to non-zero targets

### 3. **Data Augmentation**
- **Noise augmentation**: Adds Gaussian noise to sensor data
- **Time shift augmentation**: Shifts time windows to create variations
- **Configurable**: `USE_DATA_AUGMENTATION = True` to enable/disable

### 4. **Improved Model Architecture**
- **Batch Normalization**: Stabilizes training and improves convergence
- **Dropout layers**: Prevents overfitting (0.2-0.4 dropout rates)
- **Deeper RNN**: Two-layer bidirectional GRU for better feature extraction
- **Better regularization**: Multiple dropout layers at different stages

### 5. **Training Improvements**
- **Early stopping**: Prevents overfitting with patience=10
- **Learning rate reduction**: Automatically reduces LR when stuck
- **Better callbacks**: Model checkpointing, TensorBoard logging
- **Enhanced metrics**: MAE, MSE, R² for better evaluation

## Configuration Flags

Edit these at the top of `train_gait_model_improved.py`:

```python
TRAIN_ONLY_CLINICAL = True      # Train only on labeled clinical data
USE_SAMPLE_WEIGHTING = True      # Use sample weights for imbalance
USE_DATA_AUGMENTATION = True     # Augment clinical data
NON_ZERO_WEIGHT = 10.0          # Weight multiplier for non-zero scores
```

## Usage

### Run the improved training script:
```bash
cd backend
python train_gait_model_improved.py
```

### Expected Improvements:
1. **Score range**: Model should predict across full 0-100 range, not just 48-50
2. **Better metrics**: Lower MAE, higher R² score
3. **More diverse predictions**: Predictions should vary based on input features
4. **Better generalization**: Model learns meaningful patterns from sensor data

## Model Outputs

The improved script saves:
- `multiinput_gaitscore_improved.keras` - Full Keras model
- `best_model_improved.keras` - Best model during training
- `multiinput_gaitscore_improved.tflite` - TensorFlow Lite version
- `preproc_bundle_improved.pkl` - Preprocessing metadata

## Evaluation Metrics

The script now prints:
- **MAE** (Mean Absolute Error): Lower is better
- **RMSE** (Root Mean Squared Error): Lower is better
- **R²** (Coefficient of Determination): Higher is better (closer to 1.0)
- **Score distribution**: Min, max, mean of predictions vs true values

## Next Steps

1. **Run the improved script** and compare metrics with original
2. **Adjust hyperparameters** if needed:
   - `NON_ZERO_WEIGHT`: Increase if model still predicts narrow range
   - `EPOCHS`: May need more epochs for better convergence
   - `BATCH_SIZE`: Adjust based on GPU memory
3. **Collect more labeled data**: More diverse scores will improve model
4. **Fine-tune architecture**: Adjust dropout rates, layer sizes based on results

## Troubleshooting

### If model still predicts narrow range:
1. Increase `NON_ZERO_WEIGHT` to 20.0 or higher
2. Ensure `TRAIN_ONLY_CLINICAL = True` is set
3. Check that clinical scores have good distribution (not all 48-50)
4. Increase data augmentation intensity

### If model overfits:
1. Increase dropout rates (0.4 → 0.5)
2. Add more data augmentation
3. Reduce model complexity
4. Use early stopping (already implemented)

### If training is slow:
1. Reduce `BATCH_SIZE`
2. Reduce `EPOCHS` for initial testing
3. Use smaller model architecture


