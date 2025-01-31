<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## DICOM Utilities Module

### Overview

The DICOM Utilities module provides various utility functions for processing DICOM images, including operations on pixel data, metadata extraction, sorting, and reslicing. These functions aid in handling and analyzing DICOM series efficiently.

## API Reference

### `getNormalOrientation`

Computes the 3D normal from two 3D vectors derived from the image orientation DICOM tag.

#### Syntax

```typescript
getNormalOrientation(el: [number, number, number, number, number, number]): number[]
```

#### Parameters

| Parameter | Type  | Description                      |
| --------- | ----- | -------------------------------- |
| `el`      | Array | The image orientation DICOM tag. |

#### Returns

`number[]` - The computed normal vector.

---

### `getMinPixelValue`

Finds the minimum pixel value in a given pixel data array.

#### Syntax

```typescript
getMinPixelValue(pixelData: number[]): number
```

#### Parameters

| Parameter   | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `pixelData` | number[] | Array containing pixel data. |

#### Returns

`number` - The minimum pixel value.

---

### `getMaxPixelValue`

Finds the maximum pixel value in a given pixel data array.

#### Syntax

```typescript
getMaxPixelValue(pixelData: number[]): number
```

#### Parameters

| Parameter   | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `pixelData` | number[] | Array containing pixel data. |

#### Returns

`number` - The maximum pixel value.

---

### `getPixelRepresentation`

Creates a pixel representation string from DICOM tags.

#### Syntax

```typescript
getPixelRepresentation(dataSet: CustomDataSet): string
```

#### Parameters

| Parameter | Type          | Description                        |
| --------- | ------------- | ---------------------------------- |
| `dataSet` | CustomDataSet | The dataset containing DICOM tags. |

#### Returns

`string` - The pixel representation (e.g., `Sint16`, `Uint16`).

---

### `getSortedStack`

Sorts a series of image IDs based on content time, position, or instance order.

#### Syntax

```typescript
getSortedStack(seriesData: Series, sortPriorities: Array<"imagePosition" | "contentTime" | "instanceNumber">, returnSuccessMethod: boolean): object
```

#### Parameters

| Parameter             | Type    | Description                           |
| --------------------- | ------- | ------------------------------------- |
| `seriesData`          | Series  | The dataset representing the series.  |
| `sortPriorities`      | Array   | List of sorting priorities.           |
| `returnSuccessMethod` | boolean | Whether to return the success method. |

#### Returns

`object` - The sorted stack of images.

---

### `randomId`

Generates a random unique identifier.

#### Syntax

```typescript
randomId(): string
```

#### Returns

`string` - A randomly generated UID.

---

### `getImageMetadata`

Retrieves metadata for a specific image in a series.

#### Syntax

```typescript
getImageMetadata(seriesId: string, instanceUID: string, frameId?: number): object[]
```

#### Parameters

| Parameter     | Type   | Description           |
| ------------- | ------ | --------------------- |
| `seriesId`    | string | The series UID.       |
| `instanceUID` | string | The SOP Instance UID. |
| `frameId`     | number | Optional frame ID.    |

#### Returns

`object[]` - List of metadata objects containing tags, names, and values.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
