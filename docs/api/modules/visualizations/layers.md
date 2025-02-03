<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Layers Module

The Layers module in Larvitar provides a powerful way to manage and manipulate multiple layers of DICOM images. This allows for advanced visualization techniques, such as blending different imaging modalities or applying custom color maps for enhanced contrast.

For more details on each method and additional options, refer to the specific API documentation sections on Layer Management, Rendering, and Interaction.

### Key Features

The Layers module is designed to facilitate handling multiple image layers efficiently. Before using the Layers module, ensure that you have initialized the library.

- **Creating Layers:** Layers can be created from a series of images, allowing for multiple overlays within the same viewport.

- **Managing Layers:** The module supports switching between layers, adjusting opacity, and modifying rendering properties dynamically.

- **Rendering Layers:** Layers are rendered separately and can be combined using blending techniques.

- **Interaction Support:** Users can toggle layers, change their visibility, and adjust transparency interactively.

- **Use Cases:** The Layers module is particularly useful in scenarios such as CT-MR overlay, where combining different imaging modalities can enhance clinical diagnosis and visualization.

### Example: Creating and Rendering Layers

To create and render a layer, you can use the buildLayer function and associate it with a series of images:

```typescript
let layer_1 = larvitar.buildLayer(serie_1, "main");
let layer_2 = larvitar.buildLayer(serie_2, "colored", {
  opacity: 0.25,
  colormap: "hotIron"
});
```

Once layers are created, they can be rendered using:

```typescript
larvitar.renderImage(serie_1, "viewer").then(() => {
  larvitar.renderImage(serie_2, "viewer");
});
```

### Managing Layers

You can dynamically switch between layers and modify their properties, such as opacity:

```typescript
let activeLayer = larvitar.getActiveLayer("viewer");
let newOpacity =
  activeLayer.options.opacity == 1.0 ? 0.0 : activeLayer.options.opacity + 0.25;
larvitar.updateLayer("viewer", activeLayer.layerId, { opacity: newOpacity });
```

## API Reference

### `buildLayer`

Build the image layers object

#### Syntax

```typescript
buildLayer (
  series: Series,
  tag: string,
  options: { opacity: number; colormap: string }
): Layer
```

#### Parameters

| Parameter | Type                                  | Description                                  |
| --------- | ------------------------------------- | -------------------------------------------- |
| `series`  | Series                                | the series on which the layer is applied     |
| `tag`     | string                                | Tag for the layer                            |
| `options` | { opacity: number; colormap: string } | layer options {opacity:float, colormap: str} |

#### Returns

`Layer` – Cornerstone layer object:

```typescript
 {
    imageIds: series.imageIds,
    currentImageIdIndex: Math.floor(series.imageIds.length / 2),
    options: {
      name: tag,
      opacity: options?.opacity ? options?.opacity : 1.0,
      visible: true,
      viewport: {
        colormap: options?.colormap ? options?.colormap : "gray"
      }
    }
  };
```

### `updateLayer`

Change the options of a layer

#### Syntax

```typescript
updateLayer (
  elementId: string | HTMLElement,
  layerId: string,
  options: { opacity: number; colormap: string }
): void
```

#### Parameters

| Parameter   | Type                                  | Description                                   |
| ----------- | ------------------------------------- | --------------------------------------------- |
| `elementId` | string or HTMLElement                 | The html div id or Element used for rendering |
| `layerId`   | string                                | The layer id                                  |
| `options`   | { opacity: number; colormap: string } | layer options {opacity:float, colormap: str}  |

#### Returns

`Layer` – calls `cornerstone.updateImage(element);` after setting new layer's properties

### `getActiveLayer`

Get the active layer

#### Syntax

```typescript
getActiveLayer (elementId: string | HTMLElement): EnabledElementLayer
```

#### Parameters

| Parameter   | Type                  | Description                                   |
| ----------- | --------------------- | --------------------------------------------- |
| `elementId` | string or HTMLElement | The html div id or Element used for rendering |

#### Returns

`EnabledElementLayer` – The active layer object

### `setActiveLayer`

Set the active layer

#### Syntax

```typescript
setActiveLayer (elementId: string | HTMLElement, layerId: string): void
```

#### Parameters

| Parameter   | Type                  | Description                                   |
| ----------- | --------------------- | --------------------------------------------- |
| `elementId` | string or HTMLElement | The html div id or Element used for rendering |
| `layerId`   | string                | The id of the layer                           |

#### Returns

`void` – calls `cornerstone.setActiveLayer(element, layerId);`

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
