<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction: dvTools

The following tools are part of the D/Vision Lab's suite of custom imaging tools, designed to enhance functionality and user interaction within imaging workflows. These tools provide advanced capabilities for annotation, segmentation, measurement, and visualization, tailored to meet diverse application requirements. Try them out here in [Tools Demo](../../../examples/defaultTools.html) and [Segmentation Tools Demo](../../../examples/segmentationTools.html)

### WwwcRemoveRegionTool

The WwwcRemoveRegionTool enables users to adjust Window/Level settings while excluding specific regions from consideration. This functionality is particularly valuable in scenarios where certain areas need to beomitted from the contrast adjustment process. For example, in medical imaging, bright artifacts such as metal implants or surgical clips can create high-intensity regions that skew the overall contrast adjustment. By using this tool, users can exclude these artifacts from the W/L calculation, ensuring that the adjustment focuses on the relevant anatomical features.

```typescript
setToolActive("WwwcRemoveRegion");
```

### WSToggleTool

The WSToggleTool is built around the Watershed Segmentation Algorithm and offers robust functionality for segmenting regions based on user-defined thresholds. It works by analyzing a selected brush area and identifying features with similar density for segmentation. This tool can be applied to a single image slice or used across an entire volume stack, making it suitable for both 2D and 3D imaging workflows. For more information and a usage example, see the [Watershed Segmentation Demo](../../../examples/watershedSegmentationTool.html).Enspired by [Lung Lobe Segmentation by Kuhnigk et al](https://www.researchgate.net/publication/228602836_Lung_lobe_segmentation_by_anatomy-guided_3D_watershed_transform)

#### Useful features:

1. **Ctrl + Mouse Wheel: Change Brush Radius**
   Use this feature to dynamically adjust the size of the brush used for segmentation, particularly useful for handling regions of varying sizes.
2. **Click: Activate Watershed Segmentation**
3. **Ctrl + Click: Label Eraser**
   Use this feature to erase the label associated with the region clicked on.
4. **Alt + Click: Label Picker**
   The Label Picker allows users to pick an existing label by clicking on it and click again will apply the label on the selected region.
5. **Shift + Click + Drag: Manual Eraser**
   The Manual Eraser feature provides fine control over removing unwanted regions by allowing users to erase labels interactively.

```typescript
setToolActive("WSToggle");
```

### BorderMagnifyTool

The BorderMagnifyTool provides enhanced magnification of the image within a square-bordered region, allowing for detailed examination of specific areas. This tool is particularly useful for analyzing fine details, such as small features or subtle changes in texture. By focusing on specific regions, the BorderMagnifyTool helps users gain deeper insights into their imaging data.

```typescript
setToolActive("BorderMagnify");
```

### GspsTool

The GspsTool allows to parse presentation states metadata and applies them on their corresponding image based on the information stored in gspsManager (see [GSPS Manager](../managers/gspsManager.md)).

The presentation state defines how an image or multiple images should be displayed by storing key visualization parameters, including:

- grayscale contrast transformations (VOI LUT or modality LUT)
- mask subtraction for multiframe images
- selection of the displayed area of the image
- rotation, zoom, pan, flip
- image annotations, all with a specified style and position, including:

1. graphic annotations (ROIs)
2. text annotations
3. image masks and overlays
4. compound objects

(see [GSPS Standard Dicom](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_A.33.html) for more info).

```typescript
setToolEnabled("Gsps"); //also setToolPassive("Gsps") can be used
```

### CustomMouseWheelScrollTool

The CustomMouseWheelScrollTool customizes the behavior of the mouse wheel for scrolling through image stacks or other multi-layered data. This tool enhances user interaction by allowing more precise and tailored control over navigation within imaging datasets. It is particularly beneficial in applications where smooth and intuitive scrolling is essential.

#### Useful features:

1. **"Stack" Mode:** In this mode, the tool keeps the current frame fixed and scrolls through the slices of a 3D volume. Ideal for exploring a 3D dataset slice by slice while maintaining the same frame or time point in a 4D image.

2. **"Slice" Mode:** This mode fixes the current slice and scrolls through the frames in a 4D image. Useful for analyzing temporal changes or variations across different frames while focusing on a single slice. Highlihts feature changes over time in dynamic imaging studies like functional MRI or 4D ultrasound.

```typescript
setToolActive("CustomMouseWheelScroll");
```

### LengthPlotTool

The LengthPlotTool is designed for tracing three parallel lines with a configurable offset and generating a plot of grayscale values along the traced lines. This tool provides a unique way to analyze intensity variations across specific regions, making it a valuable asset for imaging workflows that require detailed intensity profiling or density analysis. Enspired by [Equine Sacroiliac Joints Research by Dyson et al](https://beva.onlinelibrary.wiley.com/doi/10.2746/042516403776148219)

```typescript
setToolActive("LengthPlot");
```

### OverlayTool

The OverlayTool enables the display of custom overlays for annotations, measurements, or data visualization. This tool enhances the interpretability of imaging data by providing users with additional layers of information directly on the image, ensuring a more comprehensive analysis experience.

#### Useful features:

1. **Overlay Extraction:**

- Retrieves overlay data from DICOM metadata.
- Supports pixel-wise overlay rendering.

2. **Pixel Shift Support:**

- Allows fractional pixel shifts for precise overlay positioning.

3. **Custom Overlay Colors:**

- Uses viewport overlay color settings for customization.

4. **Dynamic Overlay Rendering:**

- Automatically updates overlays when enabling or disabling the tool.

```typescript
setToolActive("Overlay");
```

### ThresholdsBrushTool

The ThresholdsBrushTool provides a brush-based approach to threshold segmentation, enabling users to isolate regions of interest by painting directly on the image. This tool is particularly useful for segmenting areas of similar intensity or density within an image, allowing for fine control over the segmented region. It is highly versatile and can be adapted to various imaging scenarios, making it a powerful addition to segmentation workflows.

```typescript
setToolActive("ThresholdsBrush");
```

### PolylineScissorsTool

The PolylineScissorsTool allows for precise cutting and editing of regions within an image using polyline-defined boundaries. This tool is ideal for modifying segmented regions or creating highly customized shapes. By enabling detailed control over region boundaries, the PolylineScissorsTool ensures that users can make exact adjustments to meet specific requirements in their imaging tasks.

```typescript
setToolActive("PolylineScissors");
```

### FreehandRoiTool

The FreehandRoiTool offers the flexibility to draw custom-shaped ROIs by allowing users to create freehand outlines. This tool is particularly useful for selecting irregularly shaped regions that cannot be accurately defined by standard geometric shapes. Like other ROI tools, it provides a detailed statistical analysis of the selected area.

```typescript
setToolActive("FreehandRoi");
```

### LengthTool

The LengthTool is a standard tool for measuring linear distances between two points in an image. This straightforward yet powerful tool is essential for tasks that require accurate distance measurements, such as anatomical studies, object sizing, or quality control in imaging workflows.

```typescript
setToolActive("Length");
```

### RectangleRoiTool

The RectangleRoiTool enables users to select and interact with rectangular ROIs. It provides detailed statistical information for the selected region, including area, perimeter, mean, variance, standard deviation, minimum, maximum, and mean standard deviation of SUV (Standardized Uptake Value). This comprehensive feature set makes the tool ideal for both qualitative and quantitative analysis.

```typescript
setToolActive("RectangleRoi");
```

### EllipticalRoiTool

Similar to the RectangleRoiTool, the EllipticalRoiTool allows users to define and manipulate elliptical ROIs. It also provides a detailed statistical analysis of the selected region, making it an excellent choice for analyzing rounded or irregularly shaped features within imaging data.

```typescript
setToolActive("EllipticalRoi");
```

### RectangleRoiOverlayTool

The RectangleRoiOverlayTool is designed to display rectangular regions-of-interest (ROIs) as overlays on an image. This tool provides clear visualization of specific areas of interest, aiding in tasks such as annotation, measurement, and analysis. Its simple yet effective design ensures that users can quickly and easily highlight key regions within their data.

```typescript
setToolActive("RectangleRoiOverlay");
```

### EllipticalRoiOverlayTool

The EllipticalRoiOverlayTool functions similarly to the RectangleRoiOverlayTool but is specifically designed for elliptical regions. This tool is ideal for visualizing and analyzing rounded or oval-shaped structures within an image, offering a more intuitive way to interact with such features.

```typescript
setToolActive("EllipticalRoi");
```

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
