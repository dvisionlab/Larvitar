<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## ColorMaps Module

The ColorMaps module provides functionalities for handling colormaps within a medical imaging application. It enables users to apply, modify, and manage colormaps used in rendering images.

### Key Features

- Integration with Image Rendering: The colormap is applied dynamically when rendering images, allowing users to switch colormaps interactively using keyboard shortcuts or UI elements.

- Customization: Users can define custom colormaps by creating an array of RGB values and passing them to addColorMap(). These colormaps can then be applied to specific viewports as needed.

### Example Usage

```typescript
import {
  getColormapsList,
  addColorMap,
  applyColorMap
} from "imaging/imageColormaps";

// Retrieve available colormaps
const colormaps = getColormapsList();
// Add a custom colormap
const customColors = [
  [0, 0, 0, 255],
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255]
];
addColorMap("customMap", "Custom Color Map", customColors);

// Apply a colormap to the viewer
applyColorMap("customMap", ["viewer"]);
```

## API Reference

### `getColormapsList`

Retrieve all the registered color maps.

#### Syntax

```typescript
getColormapsList(
): {
    id: string;
    key: string;
}[]
```

### `addColorMap`

Add a custom color map to cornerstone list.

#### Syntax

```typescript
addColorMap(
  colormapId: string,
  colormapName: string,
  colors: Array<Array<number>>
): colorMap
```

#### Parameters

| Parameter      | Type                 | Description                                                  |
| -------------- | -------------------- | ------------------------------------------------------------ |
| `colormapId`   | string               | The new colormap id                                          |
| `colormapName` | string               | The new colormap name                                        |
| `colors`       | Array<Array<number>> | Array containing 255 rgb colors (ie [[r,g,b], [r,g,b], ...]) |

#### Returns

`colorMap` – The new color map with chosen color sheme.

### `fillPixelData`

Fill a canvas with pixelData representing the color map

#### Syntax

```typescript
fillPixelData(canvas: HTMLCanvasElement, colormapId: string): void
```

#### Parameters

| Parameter    | Type              | Description           |
| ------------ | ----------------- | --------------------- |
| `canvas`     | HTMLCanvasElement | The target canvas     |
| `colormapId` | string            | The new colormap name |

#### Returns

`void` – calls `ctx.putImageData(colorbar, 0, 0);` on lookupTable extracted from colormap

### `applyColorMap`

Apply a color map on a viewport

#### Syntax

```typescript
applyColorMap(
  colormapId: string,
  viewportNames?: Array<string>
): colorMap
```

#### Parameters

| Parameter       | Type          | Description                             |
| --------------- | ------------- | --------------------------------------- |
| `colormapId`    | string        | The colormap name                       |
| `viewportNames` | Array<string> | List of viewports where to apply preset |

#### Returns

`colorMap` – The new applied color map.

### `HSVToRGB`

Converts an HSV (Hue, Saturation, Value) color to RGB (Red, Green, Blue) color value

#### Syntax

```typescript
HSVToRGB(hue: number, sat: number, val: number): number[]
```

#### Parameters

| Parameter | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| `hue`     | number | A number representing the hue color value        |
| `sat`     | number | A number representing the saturation color value |
| `sat`     | number | A number representing the value color value      |

#### Returns

`number[]` – An RGB color array

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
