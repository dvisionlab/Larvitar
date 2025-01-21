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

## API Reference

To enable brush tools, user can call directly the `setToolActive` / `setToolDisabled` api, in this case he has to handle brush type (thresholds or not), props (radius etc) and tool switching. Otherwise, Larvitar implements the utility functions `enableBrushTool` and `disableBrushTool` that internally handle brush type and props with a single call.

> ```typescript
> setters.toggleSegmentVisibility(htmlelement, segmentvalue, labelmapid);
> ```

> ```typescript
> setters.colorForSegmentIndexOfColorLUT(
>   colorLutIndex,
>   segmentValue,
>   colorRGBAarray
> );
> ```

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

`setters.labelmap3DForElement` is overridden to have a non-blocking behaviour, the custom code is in ./setLabelMap3D.js, same as original code in cs tools repo.function in larvitar overrides the default behaviour of cornerstone tools

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
```
