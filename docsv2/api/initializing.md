<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Initializing the Image Loader(s)

Before loading and rendering DICOM images, you must initialize the image loader using the `initializeImageLoader` function. This function configures the **DICOMImageLoader**, allowing you to specify parameters such as the maximum concurrency for decoding operations, which controls how many tasks can run simultaneously.

### Initialization Function

**`initializeImageLoader(maxConcurrency?: number): void`**  
Initializes the DICOM image loader and optionally sets the maximum concurrency for image decoding tasks.

- **`maxConcurrency`**: (optional) Specifies the maximum number of concurrent decoding tasks. Defaults to the number of CPU cores -1 if not provided.

---

### Example Initialization

Here’s an example of how to initialize the image loader and configure the maximum concurrency:

```typescript
import { initializeImageLoader } from 'larvitar';

// Initialize the image loader with a specific concurrency limit
initializeImageLoader(4);

console.log('Image loader initialized with max concurrency of 4');
```

### Registering the multi-frame custom image loader

To effectively handle multiframe DICOM images in Larvitar, it's essential to register a custom image loader. This process involves defining a loader function that can process multiframe images and then registering it with Cornerstone. 
This step is optional but mandatory for applications that need to support multiframe images.
Here's how you can achieve this:

```typescript
import { registerMultiFrameImageLoader } from 'larvitar';

// Register the custom image loader for multiframe images
registerMultiFrameImageLoader();
```

## Initializing the Cornestone Tools

What is a CornerstoneTool?
A CornerstoneTool is an interactive feature that enables users to perform various operations on medical images within a viewer. These tools are part of the Cornerstone ecosystem and provide functionalities like zooming, panning, measuring, and annotating images. They are essential for building interactive and dynamic medical imaging applications.

CornerstoneTools supports a wide variety of operations, such as:

- Navigation Tools: Zoom, pan, and scroll through images.
- Annotation Tools: Add text, mark regions, and measure distances or angles.
- Segmentation Tools: Isolate and highlight specific regions of interest.
- Custom Tools: Extend functionality with custom, user-defined interactions.

Before using CornerstoneTools, you need to initialize them by calling the initializeCSTools function. This function sets up the environment for tools, allowing you to configure their behavior (toolSettings) and appearance (toolStyle). Both parameters are optional, but providing custom configurations helps tailor the tools to your specific needs.

```typescript
import { initializeCSTools } from 'larvitar';

initializeCSTools(toolSettings?: ToolSettings, toolStyle?: ToolStyle): void
```

### ToolSettings

| Property                | Description                                                      | Default Value |
|-------------------------|------------------------------------------------------------------|---------------|
| `mouseEnabled`          | Enables tools for mouse interactions.                            | `true`        |
| `touchEnabled`          | Enables tools for touch interactions.                            | `false`       |
| `showSVGCursors`        | Enables SVG cursors for better visualization of tools.           | `true`        |
| `globalToolSyncEnabled` | Synchronizes tool settings across all viewports.                 | `true`        |
| `autoResizeViewports`   | Automatically resizes viewports when the browser window changes. | `true`        |
| `lineDash`              | Defines the dash pattern for line tools (e.g., `[4, 4]`).        | `[4, 4]`      |

---

### ToolStyle

| Property          | Description                                    | Default Value           |
|-------------------|------------------------------------------------|-------------------------|
| `width`           | Stroke width for tools (e.g., lines, circles). | `1`                     |
| `color`           | Default color for tools.                       | `"#00FF00"`             |
| `activeColor`     | Color for active tools (e.g., when selected).  | `"#FF0000"`             |
| `fillColor`       | Fill color for shapes like circles.            | `"#0000FF"`             |
| `fontFamily`      | Font family for text annotations.              | `"Arial"`               |
| `fontSize`        | Font size for text annotations.                | `12`                    |
| `backgroundColor` | Background color for text annotations.         | `"rgba(0, 0, 0, 0.5)"`  |

## Initializing the Larvitar store

TODO


<br><br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>