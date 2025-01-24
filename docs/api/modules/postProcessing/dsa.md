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

- (0028,6101) DSA Mask Operation: Specifies the mask operation to be performed (AVG_SUB, TID, REV_TID)
- (0028,6110) Frame Numbers: Specifies the frame numbers used for mask operations.
- (0028,6114) Mask Sub-pixel Shift: Specifies any fractional pixel shifts that need to be applied during mask subtraction (vertical and horizontal).
- (0028,6112) Contrast Frame Averaging: Specifies the number of contrast frames to average together before applying the subtraction.
- (0028,6102) Frame Range for Mask Operation: Defines the range of frames over which the mask operation is valid.

See [Standard Dicom DSA](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.10.html#sect_C.7.6.10)

### Functions

#### applyDSA //TODO

**Description:**
This function checks the metadata to determine the type of DSA mask operation to apply (e.g., AVG_SUB, TID, REV_TID).
It selects the appropriate DSA mask method based on the mask operation.

#### applyDSAShift

Applies DSA with pixel shift and updates the image to reflect the changes.

**Description:**
This function sets the pixel shift for DSA, uncaches the image, and then triggers an update and redraw of the image.
It logs the time taken for the operation in the console.

#### avgSubMask

Applies an average subtraction mask to the contrast frame using the specified metadata.

**Description:**
This function applies a pixel shift to the contrast frame and computes the result using a mask, potentially averaged across multiple frames.
It takes into account various DSA metadata attributes such as frame range and averaging parameters.
Logs the time taken for the operation.

#### tidMask

Applies Time Interval Differencing (TID) to subtract the contrast frame from a previous frame using the specified metadata.

**Description:**
This function calculates the difference between the current contrast frame and a reference mask frame based on the TID offset.
It handles the pixel-wise subtraction of the mask from the contrast frame.
Logs the time taken for the operation.

#### revTidMask

Applies a reverse Time Interval Differencing (revTID) to subtract multiple contrast frames from the reference frame.

**Description:**
Similar to tidMask, but the subtraction is applied across multiple frames, with the frame difference increasing for each subsequent frame.
Handles pixel-wise subtraction in reverse order.
Logs the time taken for the operation.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
