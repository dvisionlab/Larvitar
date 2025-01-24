<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction: DICOM image customization

The goal of DICOM image customization involves modifying both the metadata and the byte array in a DICOM file, adjusting tag elements, padding, and offsets to fit specific requirements. The following outlines the procedure for customizing the DICOM image:

## Procedure Overview:

- **sortTags**
- **preProcessByteArray**
- **customizeByteArray**
- **changeOffsets**

### sortTags:

Sort Tag Elements and Custom Tags Based on Crescent Offsets

**Purpose:**

This step involves sorting the DICOM tag elements, including any custom tags, based on their offset positions. Sorting is done in ascending order of their offsets, so the byte array is processed sequentially.

**Steps:**

- Sort the Tags: Organize both standard and custom tags in ascending order according to their offset positions.
- Find Minimum Offset: Identify the minimum offset in the custom tags, as this will serve as the starting shifting point for the adjustments.
- Padding Custom Tags: Add any necessary padding to the custom tags to ensure alignment with the rest of the data, ensuring that the offsets remain consistent for subsequent operations.

### pre-process ByteArray:

Check Padding Bytes in Certain Value Representations (VRs)

**Purpose:**
This step ensures that certain Value Representations (VRs) in the byte array are padded to maintain a consistent structure. Specifically, VRs that are expected to have even-length values are checked and adjusted if necessary.

**Steps:**

- Check for Odd-Length Tag Values: If the tag value has an odd length, padding is added. For example, if the tag's value is a string with an odd number of characters (e.g., "TEST1"), it will be padded with a space (ASCII 32, or " ") to make it even in length. Ex. Original: "TEST1" (length = 5, odd) -> Padded: "TEST1 " (length = 6, even). By ensuring that all tag values are of even length, this pre-processing step guarantees proper alignment in the byte array.

### customizeByteArray:

Evaluate Shifts in Each Section of the Byte Array

**Purpose:**
This step calculates the necessary shifts in the byte array caused by modifications to tag elements. Changes to the length of a tag value (e.g., when a tag is padded or truncated) will shift the positions of subsequent elements in the byte array.

**Steps:**

- Evaluate Each Tag's Shift:
  Identify any changes in the tag’s length, and determine how this will shift the subsequent tags' positions.
  For example, if a tag at offset 10 has its length reduced from 5 to 3, and the tag at offset 20 has its length increased from 5 to 10, this will cause the tags between offsets 10 and 20 to shift by the respective amount.
  The change in the offset is calculated as the difference in lengths:
  Offset 10 changes from length 5 to 3, so it shifts the next tag at Offset 20 by +(-2) (shifted backwards by 2).
  Offset 20 changes from length 5 to 10, causing the subsequent tags to shift forward by +3.
- Update Shifts for Consecutive Tags:
  Continue evaluating the shifts for the remaining tags by applying the necessary changes from the earlier tags in the array.

### changeOffsets:

Update Lengths and Offsets in Dataset and Metadata Objects

**Purpose:**
This step ensures that all tag offsets and lengths are updated accordingly in both the DataSet and the MetaData objects. The adjustments in the byte array and the tag shifts from earlier steps are reflected in the DICOM metadata.

**Steps:**

Update Each Tag's Length and Offset:
For each tag in the DataSet, adjust its length and offset based on the shifts calculated in the customizeByteArray step.
Ensure that each tag's position is accurately reflected in the updated DataSet and MetaData objects.
Verify Consistency:
After updating the offsets, check the consistency of the DataSet and MetaData objects to ensure that all tags are properly aligned with their new positions and lengths.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
