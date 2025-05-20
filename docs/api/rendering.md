<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Image Rendering and Manipulation API

The Image Rendering and Manipulation API provides essential functions for caching, loading, rendering, and modifying images within the Larvitar framework. These functionalities ensure smooth visualization and efficient image handling across different formats and use cases.

### Overview

The Image Rendering and Manipulation API is responsible for managing images in the viewport, enabling real-time interaction and modification. With this API, you can perform the following tasks:

- Load and cache images from different sources and formats
- Render images from local files or web sources
- Control viewport display settings
- Apply transformations such as inversion, flipping, and rotation
- Update and store viewport data

### Image Caching and Loading

Efficient image caching and loading are crucial for seamless rendering. These functions handle storing images temporarily to enhance performance and responsiveness.

- `clearImageCache(seriesId)`: Removes all cached images associated with a specific series ID, freeing up memory and storage.
- `loadAndCacheImage(imageIndex)`: Loads an image by its index and stores it in cache for quick access.
- `loadAndCacheImages(seriesData)`: Loads and caches multiple images based on the provided series metadata.

### Image Rendering

These functions enable rendering of images from various sources and formats.

- `renderFileImage(file, elementId)`: Renders an image from a local file (PNG, JPEG, PDF) to the specified viewport element.
  - **PNG & JPEG:** Directly displayed as standard 2D images.
  - **PDF:** Requires conversion to an image format before rendering.
- `renderWebImage(url, elementId)`: Loads and renders an image from a URL (PNG, JPEG, or other supported formats) into the designated viewport.
- `renderImage(series, elementId, options)`: Displays an image series in the viewport while applying default rendering properties such as contrast, brightness, and annotations or caching settings. It also updates the displayed image in a given series, ensuring smooth navigation between slices or frames

### Viewport Management

Viewport management functions control how images are displayed and interacted with in the user interface.

- `disableViewport(elementId)`: Disables a specific viewport, preventing further interactions or rendering.
- `unloadViewport(elementId, seriesId)`: Unloads image data from the viewport, clearing the displayed image without affecting cached data.
- `resizeViewport(elementId)`: Adjusts the viewport size dynamically, maintaining aspect ratio and resolution settings.
- `resetViewports([elementIds])`: Resets one or more viewports to their default state, clearing transformations and modifications.
- `updateViewportData(elementId)`: Updates the viewport’s metadata, including zoom level, pan position, and windowing parameters.
- `toggleMouseHandlers(elementId, disableFlag)`: Enables or disables mouse event handlers such as zoom, pan, and scroll within a viewport.
- `storeViewportData(params...)`: Saves viewport settings, ensuring consistency when switching between views or restoring previous states.

### Image Transformations

Image transformation functions allow real-time modifications to improve visualization and analysis.

- `invertImage(elementId)`: Inverts the colors of the displayed image (useful for certain radiological interpretations).
- `flipImageHorizontal(elementId)`: Flips the image horizontally, mirroring its content.
- `flipImageVertical(elementId)`: Flips the image vertically, useful for correcting misoriented images.
- `rotateImageLeft(elementId)`: Rotates the image 90 degrees counterclockwise.
- `rotateImageRight(elementId)`: Rotates the image 90 degrees clockwise.

## Rendering API `renderImage`

The `renderImage` function is responsible for rendering a DICOM image onto a specified HTML element using the cornerstone.js library. It initializes the rendering environment, loads the image, and applies optional transformations. It supports caching for improved performance.

### Function Signature

```typescript
export const renderImage = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  options?: RenderProps
): Promise<true>
```

### Parameters

| Parameter     | Type                    | Description                                                         |
|---------------|-------------------------|---------------------------------------------------------------------|
| `seriesStack` | `Series`                | The series stack containing image data.                             |
| `elementId`   | `string or HTMLElement` | The ID or the actual HTML element where the image will be rendered. |
| `options`     | `RenderProps (optional)`| Optional configuration options for rendering.                       |

#### `RenderProps` Interface

All properties are optional.

| Property              | Type         | Description                                      |
|-----------------------|--------------|--------------------------------------------------|
| `cached`              | `boolean`    | Whether to cache the image for future use.       |
| `imageIndex`          | `number`     | The index of the image to be rendered (0, N-1)   |
| `scale`               | `number`     | The scale factor for the image.                  |
| `rotation`            | `number`     | The rotation angle for the image.                |
| `translation`         | `translation`| The translation vector for the image.            |
| `voi`                 | `contrast`   | The windowing parameters for the image.          |
| `colormap`            | `string`     | The colormap to be applied to the image.         |
| `default.scale`       | `number`     | Default scale factor for the image.              |
| `default.rotation`    | `number`     | Default rotation angle for the image.            |
| `default.translation` | `translation`| Default translation vector for the image.        |
| `default.voi`         | `contrast`   | Default windowing parameters for the image.      |

#### `contrast` Interface

| Property              | Type         | Description                                |
|-----------------------|--------------|--------------------------------------------|
| `windowWidth`         | `number`     | The window width for the image.            |
| `windowCenter`        | `number`     | The window center for the image.           |

#### `translation` Interface

| Property     | Type      | Description                       |
|--------------|-----------|-----------------------------------|
| `x`          | `number`  | The translation along the x-axis. |
| `y`          | `number`  | The translation along the y-axis. |


### Returns

- A `Promise<true>` that resolves when the image is successfully rendered.

### How it works

1. **Retrieve the Target HTML Element**
   - Checks if the given `elementId` is valid and retrieves the HTML element.
   - If the element is invalid, the function logs an error and rejects the promise.

2. **Enable Cornerstone on the Element**
   - If the element is not already enabled, it enables it using `cornerstone.enable`.
   - Enable mouse listeners for the element using `toggleMouseToolsListeners`.

3. **Prepare Image Data**
   - Extracts series metadata and retrieves the appropriate image ID based on the series stack and optional `renderProps.imageIndex` value.
   - If the image ID is missing, it logs a warning and rejects the promise.
   - If `renderProps` is provided, it applies custom viewport settings.

4. **Check for Series Change**
   - Determines whether the current series (`uniqueID`) differs from the previously loaded one.

5. **Handle DSA (Digital Subtraction Angiography)**
   - If the series is DSA, sets the pixel shift using `setPixelShift` to ensure proper rendering.
   - If the series is DSA extract the imageId from the dsa series stack.

6. **Load and Render the Image**
   - Loads the image using `cornerstone.loadImage` or `cornerstone.loadAndCacheImage` depending on the `cached` option. If `cached` is true, the image is cached for future use and imageId is flagged as cached into the store.
   - Displays the image in the specified viewport.
   - Set optional custom settings such as scale, rotation, translation, colormap, and windowing parameters based on the `renderProps` parameter.
   - if the series has changed, it resets the viewport to its default state if not specified otherwise in the `renderProps` parameter.

7. **Store Viewport Data**
   - Saves viewport settings to ensure consistency across different renderings.
   - Sets `ready` status in the store to `true`.

8. **Performance Logging and Cleanup**
   - Logs the time taken for rendering.
   - Clears memory references to avoid memory leaks.

### Example Usage

```typescript
const options: RenderProps = {
  cached: true,
  scale: 1.5,
  translation: { x: 50, y: 20 },
  colormap: "hotiron",
  voi: { windowWidth: 400, windowCenter: 200 },
  default: {
    scale: 2,
    translation: { x: 0, y: 0 },
  }
};
```

```typescript
larvitar.renderImage(seriesStack, "viewer", options).then(() => {
  console.log("Image successfully rendered.");
}).catch((error) => {
  console.error("Error rendering image:", error);
});
```

### Error Handling

- If the specified HTML element is invalid, the function rejects the promise with an error message.
- If no image ID is found, the function logs a warning and rejects the promise.
- If the viewport settings cannot be retrieved, the function logs an error and rejects the promise.
  
### Limitations
- Requires the series to have valid image IDs and metadata.
- If using DSA, ensures `setPixelShift` is called appropriately.

### Notes

- This function is optimized to work with both single-frame and multi-frame DICOM images.
- Uses `cornerstoneDICOMImageLoader` for fetching and handling image data.
- Implements caching and efficient rendering techniques to improve performance.

## Rendering API `renderDICOMPDF`

The `renderDICOMPDF` function is used to render a PDF from a DICOM Encapsulated PDF. It can either display the PDF directly in an HTML element or convert it into an image before rendering.

### Function Signature

```typescript
export const renderDICOMPDF = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  convertToImage: boolean = false
): Promise<true>
```

### Parameters

| Parameter  | Type                 | Description |
|------------|----------------------|-------------|
| `seriesStack` | `Series` | The series stack containing the PDF data. |
| `elementId` | `string | HTMLElement` | The ID or the actual HTML element where the PDF will be rendered. |
| `convertToImage` | `boolean (optional)` | Whether to convert the PDF to an image before rendering. |

### Returns
Returns a `Promise<true>` that resolves when the PDF is successfully rendered.

### How it works
1. **Retrieves the Element:**
   - Identifies the target HTML element.
   - Throws an error if the element is not found.
2. **Extracts SOP Class UID:**
   - Retrieves the first instance of the series stack.
   - Checks if the SOP Class UID indicates a DICOM Encapsulated PDF.
3. **Extracts PDF Data:**
    - If valid, extracts the PDF data from the DICOM dataset.
     - If `convertToImage` is `false`, embeds the PDF in an `<object>` tag inside the target HTML element.
     - if `convertToImage` is `true`, converts the PDF into PNG images and renders the first page.
4. **Performance Logging and Cleanup:**
   - Logs the time taken for rendering.
   - Clears memory references to avoid memory leaks.

### Example Usage
```typescript
renderDICOMPDF(seriesStack, "pdfViewer", true)
  .then(() => console.log("PDF successfully rendered."))
  .catch((error) => console.error("Error rendering PDF:", error));
```

### Error Handling
- Throws an error if the target HTML element is not found.
- Rejects the promise if the SOP Class UID does not indicate a DICOM Encapsulated PDF.
- If `convertToImage` is set to `true`, but image processing fails, an error message is displayed.

### Performance Considerations
- Performance may be affected when converting large PDFs to images.


## Rendering API `renderFileImage`

The `renderFileImage` function renders an image from a local file (PNG, JPEG, PDF) onto a specified HTML element. It supports direct rendering of PNG and JPEG images and converts PDF files to images before displaying them.

### Function Signature

```typescript
export const renderFileImage = function (
  file: File,
  elementId: string | HTMLElement
): Promise<true>
```

### Parameters

| Parameter  | Type                 | Description |
|------------|----------------------|-------------|
| `file` | `File` | The local file to be rendered. |
| `elementId` | `string | HTMLElement` | The ID or the actual HTML element where the image will be rendered. |

### Returns
Returns a `Promise<true>` that resolves when the image is successfully rendered.

### How it works
1. **Retrieves the Element:**
   - Identifies the target HTML element.
   - Throws an error if the element is not found.
2. **Loads and Renders the Image:**
   - Displays the image in the specified viewport using [custom image loader](./modules/loaders/fileLoader.md).

### Example Usage
```typescript
const file = document.getElementById("fileInput").files[0];
renderFileImage(file, "viewer")
  .then(() => console.log("Image successfully rendered."))
  .catch((error) => console.error("Error rendering image:", error));
```

### Error Handling
- Throws an error if the target HTML element is not found.
- Rejects the promise if the file is invalid or cannot be loaded.

### Performance Considerations
- Performance may vary based on the file size and format.

## Rendering API `disableViewport`

The `disableViewport` function unrenders an image from the specified viewport, disabling further interactions and rendering operations.

### Function Signature

```typescript
export const disableViewport = function (
  elementId: string | HTMLElement
): void
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `elementId` | `string \| HTMLElement` | The ID or the actual HTML element where the image is displayed.   |

### Returns
This function does not return any value.

### How it works
1. **Retrieves the Element:**
   - Identifies the target HTML element.
   - Throws an error if the element is not found.
2. **Remove mouse tool listeners**
    - Disables mouse event handlers such as zoom, pan, and scroll within the viewport.
3. **Disable Cornestone:**
   - Disables the cornerstone library on the specified viewport element.
4. **Updates store**
   - Sets the `ready` status in the store to `false`.
   - Sets the `uniqueUID` value in the store to `undefined`.
5. **resets DSA pixelShift**
   - Regarding the DSA algorithm, resets the `pixelShift` value, both as constant and in the store, to `undefined`.

### Example Usage
```typescript
disableViewport("viewer");
```

### Error Handling
- Throws an error if the target HTML element is not found.

## Rendering API `unloadViewport`

The `unloadViewport` function calls the `disableViewport` function to remove an image from the specified viewport. In addition, this function clears the cached image data and removes the viewport from the store.

### Function Signature

```typescript
export const unloadViewport = function (
  elementId: string | HTMLElement,
  seriesId: string
): void
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `elementId` | `string \| HTMLElement` | The ID or the actual HTML element where the image is displayed.   |
| `seriesId`  | `string`                | The unique identifier of the series associated with the viewport. |

### Returns
This function does not return any value.

### How it works
1. **Disables the Viewport:**
   - Calls the `disableViewport` function to disable the specified viewport.
2. **Clears Cached Image Data:**
   - Removes the cached image data associated with the specified series ID.
   - Frees up memory and storage resources.
   - Logs a message indicating that the image cache has been cleared.
3. **Removes Viewport from Store:**
   - Removes the viewport data from the store to prevent further interactions.
   - Logs a message indicating that the viewport has been unloaded.

## Rendering API `resizeViewport`

The `resizeViewport` function adjusts the size of the specified viewport element while maintaining the aspect ratio and resolution settings. This function is useful for dynamically resizing the viewport based on user interactions or window resizing events.

### Function Signature

```typescript
export const resizeViewport = function (
  elementId: string | HTMLElement
): void
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `elementId` | `string \| HTMLElement` | The ID or the actual HTML element representing the viewport.      |

### Returns
This function does not return any value.

### How it works
1. **Retrieves the Element:**
   - Identifies the target HTML element.
   - Throws an error if the element is not found.
2. **Resizes the Viewport:**
   - Adjusts the size of the viewport element based on the current window dimensions.
   - Maintains the aspect ratio and resolution settings of the viewport.

### Example Usage
```typescript
resizeViewport("viewer");
```

### Error Handling
- Throws an error if the target HTML element is not found.

## Rendering API `resetViewports`

The `resetViewports` function resets one or more viewports to their default state, clearing any transformations or modifications applied to the images. This function is useful for restoring the original view settings after user interactions or image manipulations.

### Function Signature

```typescript
export const resetViewports = function (
  elementIds: string[],
  keys?: Array<"contrast" | "scaleAndTranslation" | "rotation" | "flip" | "zoom">
): void
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `elementIds` | `string[]`              | An array of viewport element IDs to be reset.                     |
| `keys`      | `Array<string>`         | An array of transformation keys to be reset (optional).           |

### Returns
This function does not return any value.

### How it works
1. **Iterates Over Viewports:**
   - Loops through the specified viewport element IDs.
2. **Resets Viewport Transformations:**
   - Clears the specified transformations (contrast, scale, translation, rotation, flip, zoom) applied to the viewports.
   - Restores the viewports to their default state.
   - Logs a message indicating that the viewports have been reset.
3. **Updates Rendered Image:**
   - Re-renders the image in each viewport to reflect the changes.
   - Ensures that the image is displayed correctly after resetting the viewports.

## Rendering API `loadAndCacheImage`

The `loadAndCacheImage` function loads an image by its index and stores it in the cache for quick access. This function is useful for preloading images and improving rendering performance when navigating through a series of images.

### Function Signature

```typescript
export const loadAndCacheImage = function (
  serieStack: Series,
  imageIndex: number
): Promise<void>
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `serieStack` | `Series`                | The series stack containing the image data.                      |
| `imageIndex` | `number`                | The index of the image to be loaded and cached.                  |

### Returns
Returns a `Promise<void>` that resolves when the image is successfully loaded and cached.

### How it works
1. **Extracts Image Data:**
   - Retrieves the image data from the series stack based on the specified index.
   - Throws an error if the image data is missing or invalid.
2. **Loads and Caches the Image:**
   - Uses the `cornerstone.loadAndCacheImage` function to load and cache the image.
   - Logs a message indicating that the image has been loaded and cached.
   - Resolves the promise once the image is successfully cached.
   - Rejects the promise if an error occurs during loading or caching.
   - Logs an error message if loading or caching fails.
   - Updates the store with the cached image data.
3. **Performance Logging and Cleanup:**
   - Logs the time taken for loading and caching the image.
   - Clears memory references to avoid memory leaks.

### Example Usage
```typescript
loadAndCacheImage(seriesStack, 5)
  .then(() => console.log("Image loaded and cached successfully."))
  .catch((error) => console.error("Error loading and caching image:", error));
```

### Error Handling
- Throws an error if the image data is missing or invalid.
- Rejects the promise if an error occurs during loading or caching.
- Logs an error message if loading or caching fails.

## Rendering API `loadAndCacheImages`

The `loadAndCacheImages` function loads and caches multiple images based on the provided series metadata. This function is useful for preloading image data and improving rendering performance when displaying a series of images.

### Function Signature

```typescript
export const loadAndCacheImages = function (
  seriesData: Series[]
): Promise<void>
```

### Parameters

| Parameter   | Type                    | Description                                                       |
|-------------|-------------------------|-------------------------------------------------------------------|
| `seriesData` | `Series[]`              | An array of series metadata objects containing image data.        |

### Returns
Returns a `Promise<void>` that resolves when all images are successfully loaded and cached.

### How it works
1. **Iterates Over Series Data:**
   - Loops through the array of series metadata objects.
2. **Loads and Caches Images:**
   - Calls the `loadAndCacheImage` function for each series in the array.
   - Logs a message indicating that the images have been loaded and cached.
   - Resolves the promise once all images are successfully cached.
   - Rejects the promise if an error occurs during loading or caching.
3. **Performance Logging and Cleanup:**
   - Logs the time taken for loading and caching the images.
   - Clears memory references to avoid memory leaks.

### Example Usage
```typescript
loadAndCacheImages(seriesData)
  .then(() => console.log("Images loaded and cached successfully."))
  .catch((error) => console.error("Error loading and caching images:", error));
```

### Error Handling
- Rejects the promise if an error occurs during loading or caching.
- Logs an error message if loading or caching fails.
- Clears memory references to avoid memory leaks.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
