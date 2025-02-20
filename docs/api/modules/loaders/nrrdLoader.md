<div style="text-align: center;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/NRRD_format_logo.png" alt="NRRD" height="200" />
</div>

# NRRD Loader

The NRRD Loader Module is a custom loader designed to handle NRRD (Nearly Raw Raster Data) files. It provides efficient parsing, caching, and integration for visualization within the `cornerstone-core` ecosystem.

## Key Responsibilities

- **Loading NRRD Images:** Implements custom logic to load volumetric images from NRRD files.
- **Metadata Extraction:** Parses NRRD headers to extract essential metadata.
- **Image ID Management:** Generates unique image IDs for frame referencing.
- **Series Integration:** Works with the [Image Manager](../managers/imageManager.md) to manage series and frames.
- **Custom Image Creation:** Converts NRRD pixel data into Cornerstone-compatible images.

## Internal Workflow

1. **Header Parsing:**
   - Extracts volume dimensions, pixel spacing, and other essential metadata.
2. **Image ID Assignment:**
   - Generates unique identifiers for each slice.
3. **Pixel Data Processing:**
   - Organizes pixel data into structured frames for visualization.
4. **Custom Image Generation:**
   - Creates Cornerstone-compatible images for rendering.

## Main Functions

### buildNrrdImage

#### Syntax:

```typescript
buildNrrdImage(volume: NrrdInputVolume, seriesId: string, custom_header: NrrdHeader): NrrdSeries
```

#### Parameters:

| Parameter       | Type            | Description                             |
| --------------- | --------------- | --------------------------------------- |
| `volume`        | NrrdInputVolume | The parsed volume object.               |
| `seriesId`      | string          | Unique identifier for the image series. |
| `custom_header` | NrrdHeader      | Custom header with additional metadata. |

#### Returns:

`NrrdSeries` – The structured NRRD image series.

---

### getNrrdImageId

#### Syntax:

```typescript
getNrrdImageId(customLoaderName: string): string
```

#### Parameters:

| Parameter          | Type   | Description                         |
| ------------------ | ------ | ----------------------------------- |
| `customLoaderName` | string | The custom image loader identifier. |

#### Returns:

`string` – A unique image ID for the loader.

---

### loadNrrdImage

#### Syntax:

```typescript
loadNrrdImage(imageId: string): ImageLoadObject
```

#### Parameters:

| Parameter | Type   | Description                       |
| --------- | ------ | --------------------------------- |
| `imageId` | string | The ID of the image to be loaded. |

#### Returns:

`ImageLoadObject` – An object containing a Promise resolving to the loaded image.

---

### getImageIdFromSlice

#### Syntax:

```typescript
getImageIdFromSlice(sliceNumber: number, orientation: string, seriesId: string): string
```

#### Parameters:

| Parameter     | Type   | Description                            |
| ------------- | ------ | -------------------------------------- |
| `sliceNumber` | number | The slice index.                       |
| `orientation` | string | The viewing orientation (axial, etc.). |
| `seriesId`    | string | The ID of the series.                  |

#### Returns:

`string` – The corresponding image ID for the slice.

---

### getSliceNumberFromImageId

#### Syntax:

```typescript
getSliceNumberFromImageId(imageId: string, orientation: string): number
```

#### Parameters:

| Parameter     | Type   | Description              |
| ------------- | ------ | ------------------------ |
| `imageId`     | string | The image ID.            |
| `orientation` | string | The viewing orientation. |

#### Returns:

`number` – The corresponding slice number.

---

### getNrrdSerieDimensions

#### Syntax:

```typescript
getNrrdSerieDimensions(): Object
```

#### Returns:

`Object` – An object containing the dimensions of the NRRD series for different orientations.

---

### clearNrrdCache

#### Syntax:

```typescript
clearNrrdCache(seriesId: string): void
```

#### Parameters:

| Parameter  | Type   | Description                                   |
| ---------- | ------ | --------------------------------------------- |
| `seriesId` | string | The ID of the series to clear from the cache. |

#### Returns:

`void` – Clears cached NRRD data.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
