<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Loading a DICOM File

The Loading Core API provides essential functions for managing the initialization, registration, and resetting of loaders in Larvitar. It is also responsible for handling the loading and updating of image stacks during file parsing or when managing single files. These functionalities ensure that DICOM files are efficiently processed, whether they are part of a series or standalone instances.

### Overview

The Loading Core API is a critical component of the Larvitar system, as it is responsible for managing the loading of DICOM files. 
With the Loading Core API, you can perform the following tasks:
- Initialize and register loaders
- Load and update image stacks
- Reset loaders

### Initialization and Registration

These functions are essential for setting up the system to load DICOM (and non DICOM) files.
- `initializeImageLoader` initializes the default DICOM image loader with optional number of workers.
- `initializeFileImageLoader` initializes the file image loader, used for png and jpg files.
- `registerNRRDImageLoader` registers the custom [NRRD image loader](../api/modules/loaders/nrrdLoader.md).
- `registerMultiFrameImageLoader` registers the custom [MultiFrame image loader](../api/modules/loaders/multiframeLoader.md).
- `registerDsaImageLoader` registers the custom [DSA image loader](../api/modules/loaders/dsaImageLoader.md).

### Loading and Updating Image Stacks

The `updateLoadedStack` function is a critical part of the Larvitar core API, responsible for managing the loading and organization of series data during parsing. It initializes series stacks, tracks metadata, handles multiframe and single-frame files, and ensures that image IDs and instance data are correctly ordered and stored.

#### Purpose
This function updates the `allSeriesStack` object with series and instance information based on the provided seriesData. It:

1. **Initializes New Series:** Creates a new entry in allSeriesStack for previously unseen series.
2. **Tracks Multiframe Data:** Processes multiframe files and stores metadata efficiently.
3. **Orders Instances:** Maintains an ordered array of image IDs (imageIds) and a mapping of instance UIDs to image IDs (instanceUIDs).
4. **Handles Sorting:** Ensures that instances are sorted by instance number, position, or content time, depending on the data type.
5. **Stores Metadata:** Updates the store with parsed and ordered image IDs for later use.

#### Key Steps in the Function

1. **Extract Metadata:** The function extracts important metadata from seriesData to identify and classify the series:

   - Identifiers: Series, study, and instance UIDs.
   - Attributes: Number of slices, frames, modality, whether the data is multiframe, or part of a staged protocol.
   - Special Handling: Identifies 4D datasets, PDFs, color images, and anonymized data.
  
2. **Initialize Series Stack:** If the series is not yet in allSeriesStack, it creates a new entry with relevant metadata. Special handling is applied for staged protocols, such as tracking stages and views.

3. **Sort Instances:** Determines the sorting method for instances:
   - Default: By InstanceNumber.
   - Fallback: By ImagePositionPatient or ContentTime for 4D datasets.

4. **Handle Multiframe Data:** For multiframe datasets:
   - Updates series metadata and stores the dataset directly in allSeriesStack.

5. **Handle Single-Frame Instances:** For single-frame datasets:
   - Generates a unique imageId for each instance using cornerstoneDICOMImageLoader.
   - Updates imageIds (ordered list) and instanceUIDs (mapping of UIDs to image IDs).

6. **Sort and Store:** After adding a new instance:
   - Sorting: Orders imageIds based on the chosen sort method.
   - Store Update: Updates the global store with the new series ID and image IDs.


#### Special Features

1. **Multiframe Support:** For multiframe files, the function tracks numberOfFrames and stores the dataset directly without generating separate imageIds.

2. **4D Dataset Handling:** Uses ContentTime for secondary ordering when dealing with temporal datasets.


3. **Staged Protocols:** Recognizes staged protocols (e.g., multi-view acquisitions) and stores additional metadata like stage and view numbers.

4. **Error Handling:** Throws an error if a unique series ID cannot be determined.
   
<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>