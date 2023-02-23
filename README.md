<p align="center">
  <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" width="100" title="hover text" alt="accessibility text">
</p>

# Larvitar

## Dicom Image Toolkit for CornerstoneJS

### Current version: 1.5.5

### Latest Published Release: 1.5.5

This library provides common DICOM functionalities to be used in web-applications: it's wrapper that simplifies the use of cornerstone-js environment.
Orthogonal multiplanar reformat is included as well as custom loader/exporter for nrrd files and [Vuex](https://vuex.vuejs.org/) custom integration.

- `index` main file
- `dataDictionary` json file for dicom tags
- `imageAnonymization` provides anonymization functionalities
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
- `imageTools` using to handle standard and custom cornerstone tools
- `imageUtils` utility functions on pixels and metadata tags
- `loaders/commonLoader` common functionalities for custom loaders
- `loaders/dicomLoader` custom loader for DICOM files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/fileLoader` custom loader for png/jpg files
- `loaders/nrrdLoader`custom loader for nrrd files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/resliceLoader` custom loader for resliced data
- `loaders/multiFrameLoader` custom loader for multiFrame data
- `parsers/nrrd` custom parser for nrrd data
- `tools/custom/contourTool` is a custom cornerstone tool for 2D visualization of segmented images
- `tools/custom/diameterTool` is a custom cornerstone tool for 2D visualization of diameter widgets
- `tools/custom/editMaskTool` is a custom cornerstone tool for 2D visualization of segmentation masks with brush functionalities
- `tools/custom/seedTool` is a custom cornerstone tool for 2D interactive seeding with custom colors and labels
- `tools/custom/thresholdsBrushTool` is a custom cornerstone tool for handling thresholds in a brush tool
- `tools/default` default tools map and configuration
- `tools/io` import and export functionalities for tools
- `tools/main` tools main functionalities
- `tools/state` tools state management
- `tools/segmentation` segmentation masks management
- `modules/vuex/larvitar.js` optional vuex state module

<br>

**Larvitar** can be used with or without `vuex` bindings:

```javascript
import { initLarvitarStore } from "larvitar";
import store from "@/store/index";

initLarvitarStore(store); // Calling this without parameters makes Larvitar use its internal store.
```

Full documentation and examples are available at http://www.dvisionlab.com/Larvitar/.

<br>

# Contributors

- Simone Manini, D/Vision Lab
- Mattia Ronzoni, D/Vision Lab
- Sara Zanchi, D/Vision Lab

![dvisionlab logo](https://www.dvisionlab.com/images/logo_dv.png)

# Dependencies

- `cornerstone`
- `cornerstone-tools`
- `dicomParser`
- `wadoImageLoader`
- `webImageLoader`
- `fileImageLoader`
- `lodash`
- `pako`
- `papaparse`

# Installation

`yarn add larvitar`

# Build package

`yarn build-lib`
`yarn build-deps`
`yarn build-examples`

# Development

Use `yarn dev-lib` to have `rollup` hot-reload (live recompiling the library).
In order to test functionalities you can modify the library import path in an example (see the `docs/examples` folder) to use the recompiled bundle in `dist/`, then serve the .html file with VSCode extension [LiveServer](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or other similar tools.
Once you are done, upgrade the version, build the library and copy it to the `docs/examples` folder. This file must be included into the commit, while docs will be compiled by the Github action.
