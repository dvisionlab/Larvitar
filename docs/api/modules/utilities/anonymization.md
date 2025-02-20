<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Image Anonymization Module

### Overview

The imageAnonymization module provides functionalities for anonymizing DICOM images by replacing metadata values with randomly generated or de-identified values. This ensures that sensitive patient information is removed while preserving the structural integrity of the image data.

## API Reference

### `anonymize`

Anonymizes a given DICOM series by replacing all metadata with randomized values. The function iterates through all image instances in the series and modifies their metadata fields.

#### Syntax

```typescript
anonymize(series: Series): Series
```

#### Parameters

| Parameter | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| `series`  | Series | The DICOM series to be anonymized. |

#### Returns

`Series` - The anonymized DICOM series.

#### Example

```typescript
import { anonymize } from "./imageAnonymization";
const anonymizedSeries = anonymize(originalSeries);
```

#### Implementation Details

- Iterates through all image instances in the series.

- Replaces metadata values based on their value representation (VR) type.

- Updates key metadata attributes such as:
  | Parameter | Description |
  | --------- | ------------------------------------------------ |
  | `seriesUID` | Index of the current image in the series |
  | `instanceUID` | Index of the current image in the series |
  | `studyUID` | Index of the current image in the series |
  | `accessionNumber` | Index of the current image in the series |
  | `studyDescription` | Index of the current image in the series |
  | `patientName` | Index of the current image in the series |
  | `patientBirthdate` | Index of the current image in the series |
  | `seriesDescription` | Index of the current image in the series |

- Marks the series as anonymized (series.anonymized = true).

##### Internal Utility Functions

- `makeDeIdentifiedValue`

```typescript
makeDeIdentifiedValue(length: number, vr: string): string | undefined
```

Generates a de-identified value based on the provided length and value representation (VR):

1. LO, SH, PN → Replaced with a random alphanumeric string.

2. DA (Date) → Set to 19000101 (January 1, 1900).

3. TM (Time) → Set to the current time with zero-padding.

- `makeRandomString`

```typescript
makeRandomString(length: number): string
```

Generates a random alphanumeric string of a given length.

- `pad`

```typescript
  pad(num: number, size: number): string
```

Pads a number with leading zeros to ensure a fixed-size string representation.

## Warnings & Considerations

This module does not alter pixel data, only metadata.
Always ensure compliance with relevant data privacy regulations (e.g., HIPAA, GDPR) before anonymizing and sharing DICOM images.
This module is provided under an open-source license. Use it responsibly in compliance with local regulations and privacy policies.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
