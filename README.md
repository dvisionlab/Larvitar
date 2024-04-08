<p align="center">
  <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" width="100" title="hover text" alt="accessibility text">
</p>

# Larvitar

[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fplantain-00%2Ftype-coverage%2Fmaster%2Fpackage.json)](https://github.com/dvisionlab/Larvitar)

## Dicom Image Toolkit for CornerstoneJS

### Current version: 2.4.25

### Latest Published Release: 2.4.25

This library provides common DICOM functionalities to be used in web-applications: it's wrapper that simplifies the use of cornerstone-js environment.

## Features:

- Orthogonal multiplanar reformat with contours generations
- Custom loader/exporter for nrrd files
- Segmentation masks support
- Memory management
- Support all dicom modalities
- 4D Cine support
- Anonymization functionalities
- Cine tools and ECG Parsing
- Masks management

Full documentation and examples are available at http://www.dvisionlab.com/Larvitar/.

# Typescript

_Types_ can be imported from `larvitar/imaging/types` or `larvitar/imaging/tools/types`.

```javascript
import { Series } from "larvitar/imaging/types";

let newSerie: Series;
```

<br>

# Dependencies

- `cornerstone`
- `cornerstone-tools`
- `dicomParser`
- `DICOMImageLoader`
- `webImageLoader`
- `fileImageLoader`
- `lodash`
- `pako`
- `papaparse`

# Installation

`yarn add larvitar`

# Build package

`yarn build`

# Coverage

Use `yarn coverage` to generate type coverage report.

# Development

Use `yarn dev` to have `webpack` hot-reload (live recompiling the library).
In order to test functionalities you can serve the .html file with VSCode extension [LiveServer](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or other similar tools.
Once you are done, upgrade the version (README and package.json) and build the library. Docs will be compiled by the Github action.

### Repository structure

- `index` main file
- `dataDictionary` json file for dicom tags
- `imageAnonymization` provides anonymization functionalities
- `imageCustomization` provides Byte Array customization functionalities
- `imageColormaps` provides color maps functionalities
- `imageContours` using to populate cornerstone tool for segmentation contours on 2D images
- `imageIo` import a dicom image in .nrrd format and build contiguous array for exporting data as volume
- `imageLayers` provide support for multi-layer cornerstone fusion renderer
- `imageLoading` initialize loader and custom loaders
- `imageParsing` parse dicom files and return a cornerstone data structure ready to be used for rendering
- `imagePresets` provides default image CT presets and set functionality
- `imageRendering` provides rendering functionalities
- `imageReslice` provides reslice functionalities
- `imageStore` provides data storage functionalities, vuex support is integrated
- `imageTags` using to handle dicom tags and metadata
- `imageTools` using to handle standard and custom cornerstone tools
- `imageUtils` utility functions on pixels and metadata tags
- `loaders/commonLoader` common functionalities for custom loaders
- `loaders/dicomLoader` custom loader for DICOM files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/fileLoader` custom loader for png/jpg files
- `loaders/multiFrameLoader` custom loader for multiFrame data
- `loaders/nrrdLoader`custom loader for nrrd files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/resliceLoader` custom loader for resliced data
- `parsers/ecg` custom parser for ecg data
- `parsers/nrrd` custom parser for nrrd data
- `tools/custom/4DSliceScrollTool` is a custom cornerstone tool for handling navigation of slices in a 4D DICOM series
- `tools/custom/contourTool` is a custom cornerstone tool for 2D visualization of segmented images
- `tools/custom/diameterTool` is a custom cornerstone tool for 2D visualization of diameter widgets
- `tools/custom/editMaskTool` is a custom cornerstone tool for 2D visualization of segmentation masks with brush functionalities
- `tools/custom/EllipticalRoiOverlayTool` is a custom cornerstone tool for 2D visualization of elliptical widgets
- `tools/custom/polygonSegmentationMixin` is a custom cornerstone tool for 2D visualization of polygonal widgets
- `tools/custom/polylineScissorTool` is a custom cornerstone tool for 2D visualization of polyline widgets
- `tools/custom/rectangleRoiOverlayTool` is a custom cornerstone tool for 2D visualization of rectangular widgets
- `tools/custom/seedTool` is a custom cornerstone tool for 2D interactive seeding with custom colors and labels
- `tools/custom/setLabelMap3D`
- `tools/custom/thresholdsBrushTool` is a custom cornerstone tool for handling thresholds in a brush tool
- `tools/default` default tools map and configuration
- `tools/interaction` cornerstone interaction tools
- `tools/io` import and export functionalities for tools
- `tools/main` tools main functionalities
- `tools/state` tools state management
- `tools/segmentation` segmentation masks management
- `tools/strategies/eraseFreeHand` strategy for erasing freehand masks
- `tools/strategies/fillFreeHand` strategy for filling freehand masks
- `tools/strategies/index` strategies index

# Contributors

- Simone Manini, D/Vision Lab
- Mattia Ronzoni, D/Vision Lab
- Sara Zanchi, D/Vision Lab
- Alessandro Re, D/Vision Lab
- Laura Borghesi, D/Vision Lab

![dvisionlab logo](https://press.r1-it.storage.cloud.it/logo_trasparent.png)
