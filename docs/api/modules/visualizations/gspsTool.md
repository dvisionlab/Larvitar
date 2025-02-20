<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# GspsTool Documentation

## Overview

The `GspsTool` class is a visualization tool for rendering presentation states over displayed medical images in a DICOM viewer. It extends `BaseTool` from `cornerstone-tools` and integrates various utilities for applying masks, transformations, LUTs, and annotations.

## Imports

The tool imports several utility functions from `gspsUtils`:

- **Masking:** `retrieveDisplayShutter`, `applyMask`
- **LUT Processing:** `applyModalityLUT`, `applySoftcopyLUT`, `applySoftcopyPresentationLUT`
- **Spatial Transformations:** `applySpatialTransformation`, `applyZoomPan`
- **Annotations & Overlays:** `retrieveAnnotationsToolData`, `retrieveOverlayToolData`, `renderOverlay`, `renderGraphicAnnotation`, `renderCompoundAnnotation`, `renderTextAnnotation`

Additionally, it imports:

- `cornerstone-core` for image rendering and viewport manipulation
- `cornerstone-tools` for drawing utilities
- `cornerstone-wado-image-loader` for DICOM image loading
- Image managers from `../../imageManagers`
- Rendering utilities from `../../imageRendering`

## Class: `GspsTool`

### Properties

- `name`: The tool name (default: "Gsps")
- `configuration`: Tool configuration settings
- `toolAnnotations`: An array for storing annotation data
- `showAnnotations`: Boolean flag to toggle annotation visibility
- `canvas`: Reference to the drawing canvas
- `gspsMetadata`: Metadata related to the GSPS (Grayscale Softcopy Presentation State)

### Constructor

Initializes the tool with default properties:

```ts
constructor(props: any = {}) {
  const defaultProps = {
    name: "Gsps",
    supportedInteractionTypes: ["Mouse", "Touch"],
    configuration: {}
  };
  super(props, defaultProps);
  this.configuration = super.configuration;
  this.name = defaultProps.name;
}
```

### Class Methods

#### `activePassiveCallback`

Performs key operations:

- Retrieves the active element and image metadata
- Checks if there is an applicable registered GSPS in GSPSDict for the currently displayed instanceUID
- Applies LUT transformations and masks
- Retrieves and renders annotations and overlays

#### `renderToolData`

Renders annotations and overlays by:

- Configuring the drawing context
- Checking image validity
- Drawing overlays, graphic annotations, text annotations, and compound annotations

#### `resetViewportToDefault`

Resets the viewport to its default state when the tool is Disabled.

#### `handleElement`

Waits for the image to become available before proceeding.

### Apply Annotations on Image

#### Retrieve Annotations from DICOM Metadata

##### `retrieveAnnotationsToolData`

Extracts annotation sequences (text and graphic objects) from DICOM metadata, organizes them for display, and handles rendering order.

```typescript
function retrieveAnnotationsToolData(
  metadata: MetaData,
  toolAnnotations: ToolAnnotations,
  graphicLayers?: MetaData[],
  graphicGroups?: MetaData[]
);
```

**Implementation Details**:

1. Retrieves the **Graphic Annotation Sequence** (`x00700001`).
2. Iterates through each annotation and extracts:
   - **Annotation ID** (`x00700002`).
   - Corresponding **Graphic Layer**.
   - **Annotation Details** (description, rendering order, color, applicable images).
3. Extracts and processes:
   - **Text Objects** (`x00700008`) using `retrieveTextObjectDetails`.
   - **Graphic Objects** (`x00700009`) using `retrieveGraphicObjectDetails`.
   - **Compound Graphic Objects** (`x00700209`) using `retrieveCompoundObjectDetails`.

---

##### `retrieveTextObjectDetails`

Extracts text annotation details, including position, bounding box, and text style.

```typescript
function retrieveTextObjectDetails(
  textObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
);
```

**Implementation Details**:

1. Extracts text position, bounding box, and anchor point.
2. Retrieves text formatting details (font, color, alignment, shadow properties).
3. Stores extracted data in `toolAnnotations` via `setToolAnnotationsAndOverlays`.

---

##### `retrieveGraphicObjectDetails`

Extracts graphic annotation details (e.g., lines, shapes) for display.

```typescript
function retrieveGraphicObjectDetails(
  graphicObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
);
```

**Implementation Details**:

1. Extracts graphic properties (dimensions, points, type, fill status).
2. Retrieves line style details (thickness, pattern, shadow effects).
3. Stores extracted data in `toolAnnotations` using `setToolAnnotationsAndOverlays`.

---

##### `retrieveCompoundObjectDetails`

Processes complex annotations that include rotation, major ticks, and detailed line styles.

```typescript
function retrieveCompoundObjectDetails(
  compoundObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
);
```

**Implementation Details**:

1. Extracts additional properties such as **rotation angle**, **tick marks**, and **line styles**.
2. Structures the extracted details.
3. Stores extracted data using `setToolAnnotationsAndOverlays`.

---

##### `findGraphicLayer`

Finds and returns the graphic layer matching a given annotation ID from `graphicLayers`.

```typescript
function findGraphicLayer(annotationID?: string, graphicLayers?: MetaData[]);
```

**Implementation Details**:

- Iterates through `graphicLayers` and returns the matching layer.

---

##### `setToolAnnotationsAndOverlays`

Inserts annotation data into `toolAnnotations` in the correct rendering order.

```typescript
function setToolAnnotationsAndOverlays(
  newData: MergedDetails,
  toolAnnotations: ToolAnnotations
);
```

**Implementation Details**:

1. Determines the correct position based on rendering order.
2. Inserts the new annotation at the determined position.

---

##### `retrieveOverlayToolData`

Extracts and structures overlay data (e.g., ROIs, labels, descriptions) from DICOM metadata.

```typescript
function retrieveOverlayToolData(
  metadata: MetaData,
  toolAnnotations: ToolAnnotations,
  graphicGroups?: MetaData[]
);
```

**Implementation Details**:

1. Extracts **presentation value**, **overlay color**, and **shutter shape**.
2. Retrieves overlay-specific metadata (rows, columns, origin, type, etc.).
3. Converts **CIELab color values** to **RGB**.
4. Structures the overlay data and inserts it into `toolAnnotations` using `setToolAnnotationsAndOverlays`.

#### Render Annotations on Image

##### `renderGraphicAnnotation`

Renders different types of graphic annotations (POINT, POLYLINE, CIRCLE, ELLIPSE) on the canvas,
adhering to DICOM graphic layer module (0070,0020) and annotation sequences.

```typescript
function renderGraphicAnnotation(
  graphicObject: GraphicDetails,
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  color: string,
  viewport: ViewportComplete,
  image: Image
  //angle: number
): void;
```

**Implementation Details**

- The function extracts viewport transformation parameters such as `xMultiplier`, `yMultiplier`, `xScope`, and `yScope`.
- If `lineStyleSequence` exists, it sets the appropriate line width, shadow color, and opacity.
- Based on the `graphicType`, it applies different rendering logic:
  1. **POINT**: Uses `fillRect` to render a small point.
  2. **POLYLINE**: Iterates through `graphicData`, applies transformation, and connects points using `moveTo` and `lineTo`.
  3. **INTERPOLATED**: Similar to `POLYLINE`, but applies interpolation between points.
  4. **CIRCLE**: Computes the radius from given points and uses `arc` to draw a circle.
  5. **ELLIPSE**: Computes transformed coordinates and utilizes `drawEllipse` for rendering.

##### `renderTextAnnotation`

This function renders a text annotation on the canvas, including its bounding box.
It calculates the correct position and size based on viewport and image dimensions.

```typescript
export function renderTextAnnotation(
  textObject: TextDetails,
  context: CanvasRenderingContext2D,
  color: string,
  element: HTMLElement,
  image: Image,
  viewport: ViewportComplete
): void;
```

**Implementation Details**

1. **Viewport Calculations**:
   - The function first calculates the `xMultiplier`, `yMultiplier`, `xScope`, and `yScope` based on the displayed area of the viewport to ensure proper scaling and positioning of the annotation.
2. **Apply Pixel to Canvas**:
   - The `applyPixelToCanvas` function is used to adjust the position and scale of the text annotation relative to the canvas coordinates. It takes into account the bounding box and anchor point of the text.
3. **Text Alignment**:
   - The function determines whether the text is centered on its anchor points or aligned based on the bounding box. The text position (`textX` and `textY`) is adjusted based on this alignment.
4. **Text Drawing**:
   - The function draws the text on the canvas at the calculated position (`textX`, `textY`) using the specified font and color.
5. **Bounding Box Drawing**:
   - A bounding box is drawn around the text annotation based on the calculated width and height.
6. **Anchor Point Link**:
   - If the anchor point is visible, a line is drawn from the anchor point to the center of the bounding box to represent the link between the text and its anchor point.

##### `renderCompoundAnnotation`

Renders different types of compound annotation:
(ELLIPSE, RECTANGLE, ARROW, MULTILINE, INFINITELINE, AXIS, RANGELINE, CUTLINE, RULER, CROSSHAIR) on the canvas,
adhering to DICOM graphic layer module (0070,0020) and annotation sequences.

```typescript
export function renderCompoundAnnotation(
  compoundObject: CompoundDetails,
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  color: string,
  viewport: ViewportComplete,
  image: Image
  //angle: number
): void;
```

**Implementation Details**

This function can render several different types of annotations based on the `graphicType` specified in the `compoundObject`. The following types are supported:

1. **ELLIPSE**: Renders an ellipse. The ellipse coordinates are calculated, optionally rotated, and drawn on the canvas. Optionally, the ellipse can be filled based on the `graphicFilled` property.
2. **RECTANGLE**: Renders a rectangle. Similar to the ellipse, rectangle coordinates are calculated, rotated, and drawn. It also supports filled rectangles.
3. **ARROW**: Renders an arrow. Arrow handles are calculated, rotated, and drawn with optional dashed lines. The arrow is drawn between the start and end handles, and optionally, a midpoint is used.
4. **MULTILINE**: Renders multiple line segments. Each segment is processed and drawn as a line between start and end handles, with rotation applied as necessary.
5. **INFINITELINE**: Renders a line that extends infinitely in both directions. The line is drawn between two handles, and any intersections with the image boundaries are detected and drawn with dashed lines.
6. **CUTLINE**: Renders a cutline, which is a line drawn between two handles with optional rotation. It also includes additional visualization options like gaps in the line.
7. **RANGELINE**: Renders a range line, which is a line between two points with perpendicular ticks at each endpoint. These ticks are visualized based on the `tickLength` property.
8. **RULER**: Renders a ruler annotation, which is a line that includes major ticks. The ticks are drawn along the ruler, with labels positioned based on the provided alignment.
9. **AXIS**: Similar to the ruler, but typically used for visualizing axes in an image or data visualization context. Includes major ticks and customizable tick alignment.
10. **CROSSHAIR**: Renders a crosshair annotation at a given origin point. It supports diameter visibility and optional gap length, drawing vertical and horizontal lines through the origin.

**Notes**

- **Rotation**: For some annotation types (e.g., arrow, ellipse, rectangle), rotation can be applied using the `rotationAngle` and `rotationPoint` properties. Rotation is performed around the defined rotation point.
- **Shadow and Line Style**: The function supports advanced line styling, including shadow effects. The shadow's color, opacity, and offset can be defined through the `lineStyleSequence`.
- **Pixel to Canvas Transformation**: Coordinates are transformed from image space to canvas space using the `applyPixelToCanvas` function, which ensures that annotations are properly scaled and positioned on the canvas based on the current viewport.
- **Customizable Line Styles**: Annotations such as arrows and lines can have customizable line thickness and dashing styles.

##### `renderOverlay`

```typescript
export function renderOverlay(data: AnnotationOverlay, image: Image): void;
```

**Implementation Details**

- **Visibility Check:** The function starts by checking if the overlay is visible (data.visible). If the overlay is not visible, the function returns early and does not render anything.
- **Creating a Canvas for Overlay:** A new canvas element (layerCanvas) is created, and its dimensions are set to match the image size. This canvas is used to draw the overlay. A 2D rendering context (layerContext) is obtained from the layerCanvas.
- **Filling the Overlay:** If the overlay type is "R", the entire canvas is filled with the fill color using fillRect(). The globalCompositeOperation is set to "xor", which means the subsequent drawing operations will use an XOR blend mode.
- **Rendering Pixel Data:** The pixelData array is iterated over, and for each non-zero value, a small rectangle (1x1 pixel) is drawn at the corresponding (x, y) position on the canvas.
- **Positioning the Overlay:** The x and y coordinates for the overlay are validated to ensure they are finite numbers. If they are invalid or missing, they default to 0.
- **Drawing the Overlay on the Image:** The overlay layer is drawn onto the image canvas using the drawImage() method. The overlay is positioned at the specified x and y coordinates.

### Apply LUT changes on Image

#### `applyModalityLUT`

Applies the Modality LUT or rescale operation to map stored pixel values to meaningful output values using DICOM attributes (x00283000, x00281052, x00281053). Handles both LUT Sequence and linear rescale.

```typescript
applyModalityLUT(
  metadata: MetaData,
  image: ImageParameters,
  viewport: Viewport
)
```

**Implementation Details**

- If the modality LUT sequence is present in the metadata, the LUT is applied by calling the setLUT function.
- If no LUT is found but both slope and intercept are provided, the rescale operation is applied to the image.

#### `applySoftcopyLUT`

Applies the Softcopy VOI LUT (Window Width and Window Center) to the viewport based on the DICOM metadata (attributes: x00281050, x00281051, x00283010). Handles both explicit VOI LUT Sequence and window settings.

```typescript
applySoftcopyLUT(metadata: MetaData, viewport: Viewport)
```

**Implementation Details**

- If VOI LUT Sequence is available, the first LUT in the sequence is applied to the viewport by calling the setLUT function.
- If VOI LUT Sequence is absent, the window width and window center are extracted from the metadata and applied directly to the viewport.

#### `applySoftcopyPresentationLUT`

Applies the Presentation LUT Sequence or shape to the viewport, modifying the display output as per DICOM attributes (x20500010, x20500020). Supports both LUT application and inversion logic.

```typescript
applySoftcopyPresentationLUT(
  metadata: MetaData,
  viewport: Viewport
)
```

**Implementation Details**

- If Presentation LUT Sequence is available, the first LUT in the sequence is applied to the viewport by calling the setLUT function.
- If Presentation LUT Sequence is not found and the Presentation LUT Shape is "INVERSE", the invert property of the viewport is set to true.

### Apply Masks on Image

#### `retrieveDisplayShutter`

Retrieves and applies a display shutter based on DICOM metadata, supporting rectangular, circular, and polygonal shutters (shape x00181600).

```typescript
retrieveDisplayShutter(
  metadata: MetaData,
  viewport: Viewport
)
```

**Implementation Details**

- The function checks for the shutter shape in the metadata and applies the appropriate shutter type:
  **Rectangular:** Draws a rectangular shutter using edges defined in the metadata.
  **Circular:** Draws a circular shutter based on the center and radius from the metadata.
  **Polygonal:** Draws a polygonal shutter using vertices from the metadata.
- Shutter Color: The shutter color is derived from the DICOM metadata (using CIELab to RGB conversion if needed).

#### `applyMask`

Enables and updates the Digital Subtraction Angiography (DSA) mask on multi-frame series, ensuring the appropriate frame is displayed.

```typescript
applyMask(serie: Series, element: HTMLElement)
```

**Implementation Details**

- If the series is a multi-frame series, this function updates the DSA mask and ensures the correct frame is displayed.
- It fetches the current frame ID and sets the DSA mask to be enabled. See [DSA](../postProcessing/dsa.md).

### Apply spatial transformations on Image

#### `applySpatialTransformation`

Applies spatial transformations like rotation and flipping to the viewport using the DICOM Graphic Layer Module (x00700041, x00700042), considering initial rotation and flip settings.

```typescript
applySpatialTransformation(
  metadata: MetaData,
  viewport: ViewportComplete
)
```

**Implementation Details**

- **Rotation:** The function checks for an angle value in the metadata and adjusts the viewport's rotation accordingly. If the viewport has an initial rotation set, that is taken into account before applying the angle from the metadata.
- **Flipping:** It handles horizontal and vertical flipping based on the metadata values. The flip behavior is adjusted if the rotation angle is 90, 180, or 270 degrees.

#### `applyZoomPan`

Applies zoom and pan transformations to the viewport based on the DICOM Displayed Area Selection Sequence (x0070005a). Handles pixel origin interpretation, top-left/bottom-right coordinates, pixel spacing, and magnification.

```typescript
applyZoomPan(
  metadata: MetaData,
  viewport: ViewportComplete,
  element: HTMLElement
)
```

**Implementation Details**

- **Displayed Area:** The function extracts the Displayed Area Selection Sequence (x0070005a) from the metadata and interprets the top-left and bottom-right coordinates.
- **Pixel Origin Interpretation:** It checks whether the pixel origin interpretation is VOLUME or FRAME, adjusting the coordinates accordingly.
- **Presentation Size Mode:** It manages the presentation size and magnification ratio, modifying the viewport scale based on the DICOM data.
- **Pixel Spacing and Aspect Ratio:** The function handles pixel spacing and aspect ratio adjustments if specified in the metadata.

## Conclusion

`GspsTool` is a powerful extension for medical image viewers, enabling proper visualization of transformations, annotations and overlays based on GSPS metadata. It leverages Cornerstone’s rendering capabilities to provide an accurate representation of medical images and associated presentation states.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
````
