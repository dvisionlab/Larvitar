<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Custom Loaders

With Custom Loaders larvitar provides a set of specialized loaders built on top of the `cornerstoneWADOImageLoader`. These loaders are designed to handle various types of DICOM images and extend the default functionality of the WADO Image Loader to support additional use cases and modalities.

## Key Features

1. **Extensibility:**
   - Custom loaders are tailored to handle specific image types that require additional parsing or preprocessing.

2. **Integration with WADO Image Loader:**
   - Leverages the robust capabilities of the cornerstoneWADOImageLoader for standard DICOM image handling while providing custom logic for specialized scenarios.

3. **Support for Diverse Image Types:**
   - Includes loaders for multiframe images, NRRD, DSA, and other non-standard image types.

## How It Works

Custom loaders are registered with the `cornerstoneWADOImageLoader` and are seamlessly integrated into existing workflows. Each loader implements the logic required to preprocess, decode, and load the specific image type into memory for visualization or analysis.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>