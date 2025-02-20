<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## ECG Waveform Module

The waveforms/ecg module provides utility functions for rendering ECG (Electrocardiogram) waveforms using plotly.js. This enables visualization of ECG data in an interactive and dynamic way, supporting real-time updates and synchronization with imaging data.

### Key Features

- **Rendering ECG Data:** Displays ECG waveform data within a given div element.

- **Customizable Layout:** Allows users to specify custom styling, colors, and grid settings.

- **Frame Synchronization:** Supports updating the ECG visualization based on image frame selection.

- **Interactivity:** Enables click and scroll events to adjust the ECG marker position dynamically.

### Use Cases

This module is particularly useful in multi-frame cardiac imaging, where ECG signals are used to correlate different phases of the heart cycle with imaging frames. Some specific applications include:

- **Cardiac MRI and CT Analysis:** Synchronizing ECG waveforms with multi-frame DICOM images to visualize heart motion and function.
- **Echocardiography Interpretation:** Aligning ultrasound frames with corresponding ECG signals for enhanced cardiac assessment.
- **Stress Testing & Holter Monitoring:** Providing real-time ECG overlays on imaging data for evaluating heart function under different conditions.
- **AI-Assisted Diagnosis:** Integrating ECG and imaging data for machine learning models in automated arrhythmia or cardiac disease detection.

### Example:

```typescript
import { renderECG, updateECGMarker } from "./waveforms/ecg";

const data = [0, 1, 0, -1, 0, 1, 0, -1];
const divId = "ecgPlot";
const colorMarker = "red";
const numberOfFrames = 100;
const frameTime = 40;
const frameId = 0;

renderECG(data, divId, colorMarker, numberOfFrames, frameTime, frameId);
```

## API Reference

### `getDefaultECGLayout`

Returns the default layout configuration for the ECG plot, including axis settings, grid styles, and background colors.

#### Syntax

```typescript
getDefaultECGLayout(): Partial<Plotly.Layout>
```

#### Returns

`Partial<Plotly.Layout>` - The default layout for ECG visualization.

### `renderECG`

Renders an ECG waveform in the specified divId with configurable properties such as color markers and frame synchronization.

#### Syntax

```typescript
renderECG(
  data: number[],
  divId: string,
  colorMarker: string,
  numberOfFrames: number,
  frameTime: number,
  frameId: number,
  customLayout?: Partial<Plotly.Layout>
): Partial<Plotly.PlotData>[]
```

#### Parameters

| Parameter        | Type                   | Description                              |
| ---------------- | ---------------------- | ---------------------------------------- |
| `data`           | number[]               | ECG waveform data                        |
| `divId`          | string                 | DivId to render waveform in              |
| `colorMarker`    | string                 | Color of the marker                      |
| `numberOfFrames` | number                 | Number of frames in the image            |
| `frameTime`      | number                 | Time interval of each frame in the image |
| `frameId`        | number                 | FrameId of the image to be rendered      |
| `customLayout`   | Partial<Plotly.Layout> | Custom layout for the plotly plot        |

#### Returns

`Partial<Plotly.PlotData>[]` - Plotly trace data

### `unrenderECG`

Removes the ECG plot from the specified divId.

#### Syntax

```typescript
renderECG(
  divId: string,
): void
```

#### Parameters

| Parameter | Type   | Description                 |
| --------- | ------ | --------------------------- |
| `divId`   | string | DivId to render waveform in |

#### Returns

`void` - Calls `Plotly.purge(divId);`

### `syncECGFrame`

Synchronizes the ECG waveform with image frames, updating marker positions based on user interaction.

#### Syntax

```typescript
syncECGFrame(
  traceData: Partial<Plotly.PlotData>[],
  seriesId: string,
  canvasId: string,
  numberOfFrames: number,
  divId: string
): void
```

#### Parameters

| Parameter        | Type                       | Description                                |
| ---------------- | -------------------------- | ------------------------------------------ |
| `traceData`      | Partial<Plotly.PlotData>[] | ECG trace data                             |
| `seriesId`       | string                     | The image series ID                        |
| `canvasId`       | string                     | The canvas ID where the image is displayed |
| `numberOfFrames` | number                     | Total number of frames in the series       |
| `divId`          | string                     | The div where the ECG is rendered          |

#### Returns

`void`

### `updateECGTotalTime`

Updates the ECG waveform based on a new total time, adjusting axis ranges accordingly.

#### Syntax

```typescript
updateECGTotalTime(
  traceData: Partial<Plotly.PlotData>[],
  frameId: number,
  numberOfFrames: number,
  frameTime: number,
  divId: string
): void
```

#### Parameters

| Parameter        | Type                       | Description                          |
| ---------------- | -------------------------- | ------------------------------------ |
| `traceData`      | Partial<Plotly.PlotData>[] | ECG trace data                       |
| `frameId`        | number                     | The current frame index              |
| `numberOfFrames` | number                     | Total number of frames in the series |
| `frameTime`      | number                     | Time interval per frame              |
| `divId`          | string                     | The div where the ECG is rendered    |

#### Returns

`void`

### `updateECGMarker`

Updates the position of the ECG marker dynamically when navigating through frames.

#### Syntax

```typescript
updateECGMarker(
  traceData: Partial<Plotly.PlotData>[],
  frameId: number,
  numberOfFrames: number,
  frameTime: number,
  divId: string
): void
```

#### Parameters

| Parameter        | Type                       | Description                          |
| ---------------- | -------------------------- | ------------------------------------ |
| `traceData`      | Partial<Plotly.PlotData>[] | ECG trace data                       |
| `frameId`        | number                     | The current frame index              |
| `numberOfFrames` | number                     | Total number of frames in the series |
| `divId`          | string                     | The div where the ECG is rendered    |

#### Returns

`void`

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
