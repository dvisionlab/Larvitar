<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# ECG Parser Module

The ECG Parser Module is designed to extract and process ECG (Electrocardiogram) signal data from a DICOM dataset. It generates a normalized array of points representing the ECG signal, suitable for visualization or analysis in medical imaging workflows

## Features

1. **Signal Downsampling:**

   - Reduces the number of points in the ECG signal for efficient processing and rendering.
   - Adjustable via the `nSampling` parameter.

2. **Normalization:**

   - Converts raw ECG signal values to a normalized scale for consistent visualization.

3. **Integration with Series Metadata:**

   - The processed ECG data is stored directly in the series `metadata`, making it accessible throughout the application.

## API Reference

`parseECG`
Generates an array of points representing the ECG signal from a DICOM dataset and stores the processed data in the series metadata.

### Syntax
    
```typescript
parseECG(
  seriesId: string,
  dataSet: DataSet,
  tag: string,
  nSampling?: number
): void
```

### Parameters

| Parameter	  | Type	| Description                                                        |
|-------------|---------|--------------------------------------------------------------------|
| `seriesId`  | string	| The unique identifier of the series to which the ECG data belongs. | 
| `dataSet`	  | DataSet	| The DICOM dataset containing the ECG signal.                       |       
| `tag`	      | string	| The DICOM tag identifying the ECG signal data element.             | 
| `nSampling` | number  | The sampling rate to downsample the signal. Defaults to 2.         | 


### Returns
`void` – The function does not return a value. The processed ECG data is stored directly in the series metadata under `ecgData`.

## How It Works

1. **Data Extraction:**

   - Reads the ECG signal data from the DICOM dataset using the provided tag.
   - Extracts the byte array from the specified element.

2. **Downsampling:**

   - The signal is downsampled to reduce the number of points based on the `nSampling` parameter. For example, if `nSampling` is `2`, every second point is retained.

3. **Normalization:**

   - The signal values are normalized to a range of `0` to `100` for consistent scaling, calculated using the formula: Normalized Value = ((Value - Min) / (Max - Min)) × 100

4. **Data Storage:**

   - The processed ECG points are stored in the series metadata under the `ecgData` field.

### Error Handling

1. **Invalid Tag:**
   
   - If the specified DICOM tag does not exist in the dataset, an error will occur.

2. **Empty Data:**
   
   - If the data element is empty or the byte array is invalid, the function will silently skip processing.

### Limitations

1. **Assumes Two-Byte Data:**

   - The function assumes that the ECG data is stored as two-byte values (Uint16). Datasets with different formats may require modifications.

2. **Single Signal Tag:**

   - Currently processes a single ECG tag at a time. Multiple tags or multichannel ECG data would require additional handling.

3. **Fixed Normalization:**

   - Normalization scales values to 0-100, which may not be suitable for all visualization needs.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>