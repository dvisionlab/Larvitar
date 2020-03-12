# Larvitar

## Dicom Image Toolkit for CornestoneJS

### Current version: 0.3.0

This library provides common dicom functionalities to be used in web-applications. Multiplanar reformat on axial, sagittal and coronal viewports is included as well as custom loader/exporter for nrrd files and orthogonal reslice.

- `index` main file
- `image_parsing` parse dicom files and return a cornestone data structure ready to be used for rendering
- `image_io` import a dicom image in .nrrd format and build contiguous array for exporting data as volume
- `image_layers` provide support for multi-layer cornerstone fusion renderer
- `image_loading` initialize loader and custom loaders
- `image_contours` using to populate cornerstone tool for segmentation contours on 2D images
- `image_tools` using to handle standard and custom cornerstone tools
- `image_rendering` provides rendering functionalities
- `image_store` provides data storage functionalities, vuex support is integrated
- `image_utils` utility functions on pixels and metadata tags
- `dataDictionary` json file for dicom tags
- `loaders/commonLoader` common functionalities for custom loaders
- `loaders/dicomLoader` custom loader for DICOM files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/nrrdLoader`custom loader for nrrd files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `loaders/resliceLoader` custom loader for resliced data
- `tools/customTool` is a the main file used to initialize custom cornerstone tools
- `tools/contourTool` is a custom cornerstone tool for 2D visualization of segmented images
- `tools/diameterTool` is a custom cornerstone tool for 2D visualization of diameter widgets
- `tools/editMaskTool` is a custom cornerstone tool for 2D visualization of segmentation masks with brush functionalities
- `tools/seedTool` is a custom cornerstone tool for 2D interactive seeding with custom colors and labels
- `tools/default` default tools map and configuration

# Contributors

- Simone Manini, D/Vision Lab
- Mattia Ronzoni, D/Vision Lab
- Sara Zanchi

# Dependencies

- `cornerstone`
- `dicomParser`
- `wadoImageLoader`
- `lodash`
- `nrrd-js`

# Installation

`yarn install larvitar`

# Build docs

Install JsDoc
`yarn global add jsdoc`

Compile (from root folder) into ./docs/ folder
`jsdoc imaging -r -d docs --verbose --readme ./README.md`

You can use custom template such as docdash (clone the repo)
`cd template/docdash`
`yarn global add docdash`

`jsdoc imaging -r -d docs --verbose --readme ./README.md -t templates/docdash`


