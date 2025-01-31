<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Digital Subtraction Algorithm (DSA)

The Digital Subtraction Algorithm (DSA) is used in X-ray angiography (XA) to subtract a reference mask (e.g., pre-contrast image) from a contrast image to highlight the contrast agent (e.g., for vascular visualization). The DSA operation enhances the image for better analysis by removing the background.

This module implements various subtraction methods as per the DICOM standard for XA images.

### DSA Methods Supported

The following DSA mask operations are supported:

- **AVG_SUB:** Average Subtraction
- **TID:** Time Interval Differencing
- **REV_TID:** Reverse Time Interval Differencing

### Related DICOM Tags

- **x00286101 - DSA Mask Operation:** Specifies the mask operation to be performed (AVG_SUB, TID, REV_TID)
- **x00286110 - Frame Numbers:** Specifies the frame numbers used for mask operations.
- **x00286114 - Mask Sub-pixel Shift:** Specifies any fractional pixel shifts that need to be applied during mask subtraction (vertical and horizontal).
- **x00286112 - Contrast Frame Averaging:** Specifies the number of contrast frames to average together before applying the subtraction.
- **x00286102 - Frame Range for Mask Operation:** Defines the range of frames over which the mask operation is valid.

See [Standard Dicom DSA](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.10.html#sect_C.7.6.10)

## API Reference

### `applyDSA`

This function checks the metadata (0028,6101) to determine the type of DSA mask operation to apply (e.g., AVG_SUB, TID, REV_TID).

#### Syntax

```typescript
applyDSA(
  multiframeSerie: Series,
  index: number,
  inputMaskSubPixelShift: number[] //pixel shift applied to the mask
): number[]
```

#### Parameters

| Parameter                | Type     | Description                     |
| ------------------------ | -------- | ------------------------------- |
| `multiFrameSerie`        | Series   | multiframe serie to apply DSA   |
| `index`                  | number   | index of the frame to apply DSA |
| `inputMaskSubPixelShift` | number[] | pixel shift applied to the mask |

#### Returns

`void` – applies mask based on switch on DSA MaskOperation

### `applyDSAShift`

Applies DSA with pixel shift and updates the image to reflect the changes.

#### Syntax

```typescript
applyDSAShift(
  elementId: string,
  multiFrameSerie: Series,
  frameId: number,
  inputMaskSubPixelShift: number[] //pixel shift applied to the mask
): void
```

#### Parameters

| Parameter                | Type     | Description                     |
| ------------------------ | -------- | ------------------------------- |
| `elementId`              | string   | elementId of the viewer         |
| `multiFrameSerie`        | Series   | multiframe serie to apply DSA   |
| `frameId`                | number   | index of the frame to apply DSA |
| `inputMaskSubPixelShift` | number[] | pixel shift applied to the mask |

#### Returns

`void` – Triggers `updateImage` and `redrawImage`

## Internal Functions

#### `avgSubMask`

Applies an average subtraction mask to the contrast frame using the specified metadata.

#### `tidMask`

Applies Time Interval Differencing (TID) to subtract a reference mask frame based on the TID offset to the current contrast frame.

#### `revTidMask`

Applies a reverse Time Interval Differencing (revTID) to subtract multiple contrast frames from the reference frame. Similar to tidMask, but the subtraction is applied across multiple frames, with the frame difference increasing for each subsequent frame.
Handles pixel-wise subtraction in reverse order

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
