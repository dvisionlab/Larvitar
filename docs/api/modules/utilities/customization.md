<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction: DICOM Image Customization

DICOM image customization involves modifying both metadata and the byte array in a DICOM file. This includes adjusting tag elements, padding, and offsets to align with specific requirements. Below is an overview of the procedure used to customize a DICOM image.

## Procedure Overview

The customization process consists of the following steps:

- **sortTags** – Organizes DICOM tags in ascending order based on offset.

- **preProcessByteArray** – Ensures proper padding for Value Representations (VRs).

- **customizeByteArray** – Evaluates shifts in the byte array.

- **changeOffsets** – Updates lengths and offsets in the dataset and metadata objects.

### sortTags: Sorting Tags and Custom Tags by Offset

**Purpose:**
Sorts standard and custom DICOM tags in ascending order based on their offset positions, ensuring sequential processing.

**Steps:**

- Organize both standard and custom tags based on offset.

- Identify the minimum offset in the custom tags to serve as the starting shift point.

- Add necessary padding to custom tags to maintain alignment.

### preProcessByteArray: Checking and Adjusting Padding

**Purpose:**
Ensures that certain Value Representations (VRs) maintain a consistent structure by enforcing even-length values.

**Steps:**

- Identify odd-length tag values and pad them with a space (ASCII 32) if needed.

**Example:** A tag value of "TEST1" (length = 5) will be padded to "TEST1 " (length = 6) to maintain even-length formatting.

### customizeByteArray: Evaluating Byte Array Shifts

**Purpose:**
Calculates necessary shifts in the byte array caused by tag modifications, ensuring proper alignment.

**Steps:**

- Identify changes in tag lengths and compute how these modifications affect subsequent tag positions.

- Apply the necessary shifts to adjust the dataset structure.

**Example:** A tag at offset 10 changes from length 5 to 3, shifting subsequent tags backward by 2 bytes.

- Update shifts for all consecutive tags to maintain consistency.

### changeOffsets: Updating Dataset and Metadata

**Purpose:**
Ensures that all tag offsets and lengths are accurately updated in both the dataset and metadata objects.

**Steps:**

- Adjust tag lengths and offsets according to the shifts determined in customizeByteArray.

- Verify that all tags are properly aligned in the dataset.

- Ensure metadata consistency by checking that tag values are correctly mapped in the updated structure.

## API Reference

`customizeByteArray`

Generates a customized version of the DICOM series by modifying its metadata and byte array based on specified custom tags.

### Syntax

```typescript
customizeByteArray (
series: Series,
customTags: MetaData
): Series
```

### Parameters

| Parameter    | Type     | Description                         |
| ------------ | -------- | ----------------------------------- |
| `series`     | Series   | Series to customize                 |
| `customTags` | MetaData | The customized tags/metadata to set |

### Returns

`Series` – The customized series with updated metadata and byte array.

## How to save the customized series

To save the newly modified series as a DICOM file, use the following approach:

```typescript
var blob = new Blob(
  [
    series.instances[
      series.imageIds[
        parseInt(document.getElementById("downloadInput").value, 10)
      ]
    ].dataSet.byteArray
  ],
  {
    type: "application/dicom"
  }
);
```

This code creates a Blob object from the byte array of a selected instance in the series, allowing it to be saved as a valid DICOM file.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
