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
- `renderImage(series, elementId, options)`: Displays an image series in the viewport while applying default rendering properties such as contrast, brightness, and annotations or caching settings.
- `updateImage(series, elementId, imageIndex)`: Updates the displayed image in a given series, ensuring smooth navigation between slices or frames.

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

### Rendering API
TODO (with new options parameter)

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
