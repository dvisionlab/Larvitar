<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# DICOM Loader

The Common Loader Module provides essential utilities for handling and extracting image data from DICOM datasets. It supports the computation and retrieval of image frame metadata, enabling seamless integration with imaging workflows.

## Key Responsibilities

- **Extract Image Frames:** Retrieves metadata for a specific image frame from DICOM datasets.
- **Integration with DICOM Parsers:** Works in conjunction with the cornerstoneDICOMImageLoader for efficient decoding.
- **Metadata Fallback:** Provides fallback metadata extraction when the dataset is unavailable.
  
## How It Works

1. **Dataset-Driven Extraction:**
   - If the dataSet parameter is provided, metadata is extracted using the cornerstoneDICOMImageLoader API.
   - This ensures compatibility with DICOM standard formats.

2. **Metadata Fallback:**
    - If no dataSet is available, the function falls back to extracting metadata from the provided metadata object.

3. **Structured Output:**
   - Returns a standardized object containing all relevant image frame properties, including pixel configurations and optional color lookup tables.

<br></br>


<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>