<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## The Larvitar Store

The Larvitar Store is a centralized data configuration store that manages the state and settings required for the application. It keeps track of information related to tools, series, viewports, and other imaging-related data, enabling dynamic interaction with the viewer.

### Core Responsibilities

The Larvitar Store serves several key purposes:

1. **Tools Management:**
   - Stores the currently active tools for the left and right mouse buttons.
   - Allows dynamic switching and resetting of tools.

2. **Series Management:**
Tracks series data, including:
   - imageIds: Array of image identifiers for each series.
   - cached: Indicates whether each image in the series has been cached.
   - progress: Tracks the loading progress of the series.
   - elementId: HTML element ID where the series is rendered.

3. **Viewport Management:**
Keeps viewport-specific data, such as:
   - Slice and time positions (sliceId, timeId).
   - Pixel spacing, dimensions, and modality.
   - Viewer settings like zoom, rotation, and translation.

4. **Error and Logging:**
Captures errors and logs them for debugging purposes.


### Store Structure

The store is defined by the [Store type](https://github.com/dvisionlab/Larvitar/blob/master/imaging/imageStore.ts#L17) and includes the following key properties:

| Property          | Type                                      | Description                                               |
|-------------------|-------------------------------------------|-----------------------------------------------------------|
| `colormapId`	    | `string`	                                | Current colormap identifier (e.g., "gray").               |
| `errorLog	`       | `string`	                                | Error log for debugging.                                  |
| `leftActiveTool`  | `string (optional)`	                    | Active tool for the left mouse button.                    |
| `rightActiveTool` | `string (optional)`	                    | Active tool for the right mouse button.                   |
| `series`	        | `{ [seriesUID: string]: StoreSeries }`    | Object mapping `seriesUID` to series-specific data.       |
| `viewports`	    | `{ [key: string]: StoreViewport }`	    | Object mapping viewport IDs to viewport-specific data.    |

The `StoreSeries` type includes the following key properties:

| Property          | Type                                  | Description                                                         |
|-------------------|---------------------------------------|---------------------------------------------------------------------|
| `imageIds` 	    | `string`	                            | Array of `imageIds` for the series.                                 |
| `cached`          | `{ [imageId: string]: boolean }`	    | Tracks whether each `imageId` in the series has been cached or not. |

The `StoreViewport` [type](https://github.com/dvisionlab/Larvitar/blob/master/imaging/types.d.ts#L34) includes the following key properties:

| Property                      | Type           | Description                                                               |
|-------------------------------|--------------- |---------------------------------------------------------------------------|
| `loading` 	                 | `number`	    | Caching progress of the series from 0% to 100 %, initialized to null.     |
| `ready`                       | `boolean`	    | True when the viewport is ready and imageId has been rendered.            |
| `seriesUID`                   | `string?`	    | Unique identifier for the series.                                         |
| `modality`                    | `string`	    | Modality of the image (e.g., "CT").                                       |
| `isColor`                     | `boolean`	    | True if the image is in color.                                            |
| `isMultiframe`                | `boolean`	    | True if the image is multiframe.                                          |
| `isTimeserie`                 | `boolean`	    | True if the image is a timeserie.                                         |
| `isDSAEnabled`                | `boolean`	    | True if DSA is enabled.                                                   |
| `isPDF`                       | `boolean`	    | True if the image is a PDF.                                               |
| `imageId`                     | `string`	    | Identifier for the image.                                                 |
| `rows`                        | `number`	    | Rows in the image.                                                        |
| `cols`                        | `number`	    | Columns in the image.                                                     |
| `spacing_x`                   | `number`	    | Spacing in the x direction.                                               |
| `spacing_y`                   | `number`	    | Spacing in the y direction.                                               |
| `thickness`                   | `number`	    | Slice thickness.                                                          |
| `numberOfSlices`              | `number?`	    | Number of slices in the image.                                            |
| `numberOfFrames`              | `number?`	    | Number of frames in the image.                                            |
| `minPixelValue`               | `number`	    | Minimum pixel value.                                                      |    
| `maxPixelValue`               | `number`	    | Maximum pixel value.                                                      |
| `sliceId`                     | `number`	    | Slice index identifier of the rendered image.                             |
| `minSliceId`                  | `number`	    | Minimum slice index.                                                      |
| `maxSliceId`                  | `number`	    | Maximum slice index.                                                      |
| `pendingSliceId`              | `number?`	    | Pending slice index to be rendered.                                       |
| `timeId`                      | `number`	    | Time index identifier, for timeseries.                                    |
| `timeIndex`                   | `number?`	    | Time index, for timeseries.                                               |
| `minTimeId`                   | `number`	    | Minimum time index, for timeseries.                                       |
| `maxTimeId`                   | `number`	    | Maximum time index, for timeseries.                                       |
| `timeIds`                     | `number[]`	    | Array of time index identifiers, for timeseries.                          |
| `timestamp`                   | `number`	    | Timestamp of the image, for timeseries.                                   |
| `timestamps`                  | `number[]`	    | Array of image timestamps, for timeseries.                                |
| `numberOfTemporalPositions`   | `number?`	    | Number of temporal positions, for timeseries.                             |
| `dsa`                         | `boolean`	    | True if DSA is enabled.                                                   |
| `pixelShift`                  | `number[]`	    | Pixel shift for the image in DSA mode.                                    |
| `waveform`                    | `boolean`	    | True if the image has waveform data, for ecg                              |
| `viewport`                    | `viewportType` | Type of the viewport.                                                     |

The `Viewport` type includes the following key properties:

| Property          | Type          | Description                                                                   |
|-------------------|---------------|-------------------------------------------------------------------------------|
| `scale`	        | `number`	                                    | Current scale factor for the viewport.       |
| `rotation`	     | `number`                                       | Current rotation for the viewport.           |
| `translation`	  | `{x:number, y:number}`	                        | Current translation for the viewport.        |
| `voi`	           | `{windowCenter:number, windowWidth:number}`	   | Current windowing settings for the viewport. |
| `default`         | `viewportType`                                 | Default viewport settings.                   |

### Initialization

The store must be initialized before use:

```typescript
import { store } from 'larvitar';
store.initialize();
```

### Viewport Management

A Viewport is a window that displays an image. The store manages viewport-specific data, such as the slice and time positions, pixel spacing, dimensions, and modality. It also stores viewer settings like zoom, rotation, and translation.

To add a viewport to the store, use the `addViewport` function with the HTML element ID where the viewport is rendered:

```typescript
import { store } from 'larvitar';
store.addViewport(elementId);
```

To get the viewport data for a specific element ID, use the `get` function with the viewport key:

```typescript
import { store } from 'larvitar';
const viewport = store.get(["viewports", elementId]);
```

To delete a viewport from the store, use the `deleteViewport` function with the viewport key:

```typescript
import { store } from 'larvitar';
store.deleteViewport(elementId);
```

### Series Management

The store tracks series data, including image identifiers, caching status, and loading progress. 

To add a series to the store, use the `addSeriesId` function with the series UID and imageIds:

```typescript
import { store } from 'larvitar';
store.addSeriesId(seriesUID, imageIds);
```

To remove a series from the store, use the `removeSeriesId` function with the series UID:

```typescript
import { store } from 'larvitar';
store.removeSeriesId(seriesUID);
```

To remove all series from the store, use the `resetSeriesIds` function:

```typescript
import { store } from 'larvitar';
store.resetSeriesIds();
```

### Useful functions

The store provides several utility functions for managing data:

| Function             | Parameters                    | Description                                                           |
|----------------------|-------------------------------|-----------------------------------------------------------------------|
| `setSliceId`	        | `elementId`, `imageIndex`     | Sets the slice ID for the viewport identified by elementId.           |
| `setPendingSliceId`  | `elementId`, `timeIndex`      | Sets the pending slice ID for the viewport identified by elementId.   |
| `setMaxSliceId`	     | `elementId`, `imageIndex`     | Sets the max Slice ID for the viewport identified by elementId.       |
| `setTimeId`	        | `elementId`, `timeIndex`      | Sets the time ID for the viewport identified by elementId.            |
| `setDSAEnabled`	     | `elementId`, `enabled`        | Sets the DSA mode for the viewport identified by elementId.           |
| `setDSAPixelShift`	  | `elementId`, `pixelShift`     | Sets the DSA pixel shift for the viewport identified by elementId.    |
| `ResetActiveTools`	  | `elementId`                   | Resets the active tools.                                              |


<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>