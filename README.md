# Larvitar

## Dicom Image Toolkit for CornestoneJS

### Current version: 0.2.0

This library provides common dicom functionalities to be used in web-applications. Multiplanar reformat on axial, sagittal and coronal viewports is included as well as custom loader/exporter for nrrd files.

- `image_parsing` parse dicom files and return a cornestone data structure ready to be used for rendering
- `image_io` save and load a dicom image in .nrrd format
- `image_loading` initialize loader and populate data
- `image_contours` using to populate cornerstone tool for segmentation contours on 2D images
- `image_tools` using to handle standard and custom cornerstone tools
- `nrrdLoader`custom loader for nrrd files with support for multiplanar reformat (axial, sagittal and coronal planes)
- `image_rendering` provides rendering functionalities
- `image_layers` provides multi-layer support
- `image_utils` utility functions on pixels and metadata tags
- `dataDictionary` json file for dicom tags
- `tools/customTool` is a the main file used to initialize custom cornerstone tools
- `tools/contourTool` is a custom cornerstone tool for 2D visualization of segmented images
- `tools/diameterTool` is a custom cornerstone tool for 2D visualization of diameter widgets
- `tools/editMaskTool` is a custom cornerstone tool for 2D visualization of segmentation masks with brush functionalities
- `tools/seedTool` is a custom cornerstone tool for 2D interactive seeding with custom colors and labels

# Coming soon in next version(s)

- Integration and examples with front-end app
- Curvilinear multiplanar reformat
- Integration with cornerstone-tools
- Custom cornerstone-tools

# Dependencies

- `cornerstone`
- `dicomParser`
- `wadoImageLoader`
- `lodash`
- `nrrd-js`
