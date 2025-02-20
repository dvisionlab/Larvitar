<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction

This guide covers the key concepts of segmentation mask management in Larvitar, utilizing the segmentation module of Cornerstone Tools. In this context, different volumetric data are represented as **labelmaps**, and each labelmap can contain multiple **segments**. A labelmap can support up to 2^16 segments.

The values within a labelmap correspond to specific **labels**, which determine the color from the LUT (Look-Up Table) used for visualization. These labels are assigned distinct colors and can be individually shown or hidden. Each labelmap can be associated with a different colormap and has an active/inactive property that influences the rendering style.

### Key Terminology

- **Segmentation Mask (or Mask):** A set of pixels representing a specific structure within a volume.
- **Volume:** A buffer that stores one or more segmentations.
- **Label:** A numerical identifier within a volume, corresponding to a specific segmentation.

### Useful setters

- **toggleSegmentVisibility:**

  > ```typescript
  > setters.toggleSegmentVisibility(htmlelement, segmentvalue, labelmapid);
  > ```

- **colorForSegmentIndexOfColorLUT:**
  > ```typescript
  > setters.colorForSegmentIndexOfColorLUT(
  >   colorLutIndex,
  >   segmentValue,
  >   colorRGBAarray
  > );
  > ```

## API Reference

### `initSegmentationModule`

A function to group all settings to load before masks

#### Syntax

```typescript
initSegmentationModule(customConfig: SegmentationConfig)
```

#### Parameters

| Parameter      | Type               | Description                                                      |
| -------------- | ------------------ | ---------------------------------------------------------------- |
| `customConfig` | SegmentationConfig | Object containing override values for segmentation module config |

#### Returns

`void` - sets segmentation module configuration

### `enableBrushTool`

To enable brush tools, user can call directly the `setToolEnabled` api. Otherwise, Larvitar implements the utility the function`enableBrushTool` that internally handle brush type and props with a single call.

#### Syntax

```typescript
enableBrushTool(viewports: string[], options: BrushProperties)
```

#### Parameters

| Parameter   | Type            | Description                                                            |
| ----------- | --------------- | ---------------------------------------------------------------------- |
| `viewports` | string[]        | Viewports Id list on which brush tool will be enabled                  |
| `options`   | BrushProperties | Object containing configuration values (eg radius, thresholds, etc...) |

NOTE: if options contains `thresholds`, ThresholdsBrush is activated, otherwise BrushTool is activated.

#### Returns

`"ThresholdsBrush" | "Brush"` - the activated tool name

### `disableBrushTool`

To disable brush tools, user can call directly the `setToolDisabled` api. Otherwise, Larvitar implements the utility the function`disableBrushTool` that internally handle brush type and props with a single call.

#### Syntax

```typescript
disableBrushTool(viewports: string[], toolToActivate?: string)
```

#### Parameters

| Parameter   | Type     | Description                                                         |
| ----------- | -------- | ------------------------------------------------------------------- |
| `viewports` | string[] | Viewports Id list on which brush tool will be disabled              |
| `options`   | string   | The name of the tool to activate after removing the brush @optional |

#### Returns

`void` - this function disables both brush tools, if found active on `viewports`

### `addSegmentationMask`

A function to group all settings to load before masks

#### Syntax

```typescript
addSegmentationMask(
  props: MaskProperties,
  data: TypedArray,
  elementId: string | HTMLElement
)
```

#### Parameters

| Parameter      | Type               | Description                                                      |
| -------------- | ------------------ | ---------------------------------------------------------------- |
| `customConfig` | SegmentationConfig | Object containing override values for segmentation module config |
| `customConfig` | SegmentationConfig | Object containing override values for segmentation module config |
| `customConfig` | SegmentationConfig | Object containing override values for segmentation module config |

#### Returns

`void` - sets segmentation module configuration

### `setLabelColor`

Sets a color for a certain label

#### Syntax

```typescript
setLabelColor(labelId: string, color: string)
```

#### Parameters

| Parameter | Type   | Description                                                                     |
| --------- | ------ | ------------------------------------------------------------------------------- |
| `labelId` | string | The identifier of the label whose color needs to be set.                        |
| `color`   | string | The color value to be applied, typically in hexadecimal format (e.g., #FF5733). |

#### Returns

`void`

### `getLabelColor`

Gets the color for a certain label

#### Syntax

```typescript
getLabelColor(labelId: string)
```

#### Parameters

| Parameter | Type   | Description                                              |
| --------- | ------ | -------------------------------------------------------- |
| `labelId` | string | The identifier of the label whose color needs to be set. |

#### Returns

`string` - returns the color value for the label, typically in hexadecimal format

### `loadMaskSlice`

Set a new mask slice into the labelmap buffer

#### Syntax

```typescript
loadMaskSlice(
  elementId: string | HTMLElement,
  sliceIndex: number,
  pixelData: TypedArray
)
```

#### Parameters

| Parameter    | Type                  | Description                                       |
| ------------ | --------------------- | ------------------------------------------------- |
| `elementId`  | HTMLElement or string | The target html element Id or its DOM HTMLElement |
| `sliceIndex` | number                | The index of the new mask slice                   |
| `pixelData`  | TypedArray            | The pixelData array                               |

#### Returns

`void`

### `setActiveLabelmap`

Activate a specific labelmap through its labelId

#### Syntax

```typescript
setActiveLabelmap(
  labelId: number,
  elementId: string | HTMLElement
)
```

#### Parameters

| Parameter   | Type                  | Description                                       |
| ----------- | --------------------- | ------------------------------------------------- |
| `labelId`   | number                | The labelmap id to activate                       |
| `elementId` | string or HTMLElement | The target html element Id or its DOM HTMLElement |

#### Returns

`void`

### `getActiveLabelmapBuffer`

Get active labelmap for target element

#### Syntax

```typescript
getActiveLabelmapBuffer(elementId: string | HTMLElement)
```

#### Parameters

| Parameter   | Type                   | Description                                       |
| ----------- | ---------------------- | ------------------------------------------------- |
| `elementId` | stringg or HTMLElement | The target html element Id or its DOM HTMLElement |

#### Returns

`Object` - The active labelmap object that contains the buffer

### `setActiveSegment`

Activate a specific segment through its index

#### Syntax

```typescript
 setActiveSegment(
  segmentIndex: number,
  elementId: string | HTMLElement
)
```

#### Parameters

| Parameter      | Type                  | Description                                       |
| -------------- | --------------------- | ------------------------------------------------- |
| `segmentIndex` | number                | The segment index to activate                     |
| `elementId`    | string or HTMLElement | The target html element Id or its DOM HTMLElement |

#### Returns

`void`

### `setActiveLabelOpacity`

Change opacity for active label

#### Syntax

```typescript
setActiveLabelOpacity(opacity: number)
```

#### Parameters

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| `opacity` | number | The desired opacity value |

#### Returns

`void`

### `setInactiveLabelOpacity`

Change opacity for inactive labels

#### Syntax

```typescript
setInactiveLabelOpacity(opacity: number)
```

#### Parameters

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| `opacity` | number | The desired opacity value |

#### Returns

`void`

### `toggleVisibility`

Toggle mask visibility

#### Syntax

```typescript
toggleVisibility(
  elementId: string | HTMLElement,
  labelId: number
)
```

#### Parameters

| Parameter   | Type                  | Description                                       |
| ----------- | --------------------- | ------------------------------------------------- |
| `elementId` | string or HTMLElement | The target html element Id or its DOM HTMLElement |
| `labelId`   | number                | The id of the mask label                          |

#### Returns

`void`

### `toggleContourMode`

Toggle between 'contours mode' and 'filled mode'

#### Syntax

```typescript
toggleContourMode(toggle: boolean)
```

#### Parameters

| Parameter | Type    | Description                  |
| --------- | ------- | ---------------------------- |
| `toggle`  | boolean | Contour mode enabled if true |

#### Returns

`void` - forces a new render with chosen modality

### `setMaskProps`

Set mask appearance props:

- labelId
- visualization [0=filled, 1=contour, 2=hidden]
- opacity (if mode=0), between 0 and 1

#### Syntax

```typescript
setMaskProps(props: MaskProperties)
```

#### Parameters

| Parameter | Type           | Description               |
| --------- | -------------- | ------------------------- |
| `props`   | MaskProperties | The mask appearance props |

#### Returns

`void` - forces a new render with chosen appearance props

### `clearSegmentationState`

Clear state for segmentation module

#### Syntax

```typescript
clearSegmentationState();
```

#### Returns

`void`

### `setBrushProps`

Change the brush props:

- radius: number[px]
- thresholds: array[min,max]

#### Syntax

```typescript
setBrushProps(props: BrushProperties)
```

#### Parameters

| Parameter | Type            | Description         |
| --------- | --------------- | ------------------- |
| `props`   | BrushProperties | The new brush props |

#### Returns

`void` - forces a new render with chosen brush props

### `undoLastStroke`

Undo last brush operation (stroke)

#### Syntax

```typescript
undoLastStroke(elementId: string | HTMLElement)
```

#### Parameters

| Parameter   | Type                  | Description                                       |
| ----------- | --------------------- | ------------------------------------------------- |
| `elementId` | string or HTMLElement | The target html element Id or its DOM HTMLElement |

#### Returns

`void` - forces a new render with undone brush operations

### `redoLastStroke`

Redo last brush operation (stroke)

#### Syntax

```typescript
redoLastStroke(elementId: string | HTMLElement)
```

#### Parameters

| Parameter   | Type                  | Description                                       |
| ----------- | --------------------- | ------------------------------------------------- |
| `elementId` | string or HTMLElement | The target html element Id or its DOM HTMLElement |

#### Returns

`void` - forces a new render with redone brush operations

### `deleteMask`

Delete mask from state

#### Syntax

```typescript
deleteMask(labelId: number )
```

#### Parameters

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| `labelId` | number | The labelmap id to delete |

#### Returns

`void` - forces a new render with deleted label

### `setLabelmap3DByFirstImageId`

Takes an 16-bit encoded `ArrayBuffer` and stores it as a `Labelmap3D` for the `BrushStackState` associated with the firstImageId.

#### Syntax

```typescript
setLabelmap3DByFirstImageId(
  firstImageId: string,
  buffer: ArrayBuffer,
  labelmapIndex: number,
  metadata: Object[] = [],
  numberOfFrames: number,
  segmentsOnLabelmapArray: number[][],
  colorLUTIndex: number = 0
)
```

#### Parameters

| Parameter                 | Type        | Description                                                   |
| ------------------------- | ----------- | ------------------------------------------------------------- |
| `firstImageId`            | string      | The firstImageId of the series to store the segmentation on.  |
| `buffer`                  | ArrayBuffer | The array buffer to store as labelMap                         |
| `labelmapIndex`           | number      | The index to store the labelmap under.                        |
| `metadata`                | Object[]    | Any metadata about the segments.                              |
| `numberOfFrames`          | number      | The number of frames to set up the relevant labelmap2D views. |
| `segmentsOnLabelmapArray` | number[][]  | An array of array of segments on each imageIdIndex.           |
| `colorLUTIndex`           | number      | The index of the colorLUT to use to render the segmentation.  |

#### Returns

`Promise<...>` - the function is async

### `setLabelmap3DForElement`

Takes a 16-bit encoded `ArrayBuffer` and stores it as a `Labelmap3D` for the `BrushStackState` associated with the element.

#### Syntax

```typescript
setLabelmap3DForElement(
  elementOrEnabledElementUID: EnabledElement | string,
  buffer: ArrayBuffer,
  labelmapIndex: number,
  metadata: Object[] = [],
  segmentsOnLabelmapArray: number[][],
  colorLUTIndex = 0
)
```

#### Parameters

| Parameter                    | Type           | Description                                                  |
| ---------------------------- | -------------- | ------------------------------------------------------------ |
| `elementOrEnabledElementUID` | EnabledElement | The firstImageId of the series to store the segmentation on. |
| `buffer`                     | ArrayBuffer    | The array buffer to store as labelMap                        |
| `labelmapIndex`              | number         | The index to store the labelmap under.                       |
| `metadata`                   | Object[]       | Any metadata about the segments.                             |
| `segmentsOnLabelmapArray`    | number[][]     | An array of array of segments on each imageIdIndex.          |
| `colorLUTIndex`              | number         | The index of the colorLUT to use to render the segmentation. |

#### Returns

`Promise<...>` - the function is async
<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
````
