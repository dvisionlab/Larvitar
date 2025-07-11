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
### `getMinMaxPixelValue`

Finds both the minimum and maximum pixel value in a given pixel data array.

#### Syntax

```typescript
getMinMaxPixelValue(pixelData: number[]): {
  minPixelValue: number;
  maxPixelValue: number;
}
```

#### Parameters

| Parameter   | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `pixelData` | number[] | Array containing pixel data. |

#### Returns

```typescript
{
  minPixelValue: number;
  maxPixelValue: number;
}
```
- The minimum and maximum pixel values.

---

### `getMeanValue`

Get the mean value of a specified dicom tag in a serie.

#### Syntax

```typescript
getMeanValue(
  series: Series,
  tag: keyof MetaData,
  isArray: boolean
): number | number[]
```

#### Parameters

| Parameter | Type           | Description                   |
| --------- | -------------- | ----------------------------- |
| `series`  | Series         | The cornerstone series object |
| `tag`     | keyof MetaData | The target tag key            |
| `isArray` | boolean        | True if tag value is an array |

#### Returns

`number` - Tag mean value

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

### `getTypedArrayFromDataType`

Get a typed array from a representation type

#### Syntax

```typescript
getTypedArrayFromDataType(dataType: string) : typedArray
```

#### Parameters

| Parameter  | Type   | Description   |
| ---------- | ------ | ------------- |
| `dataType` | string | The data type |

#### Returns

`typedArray` - Get typed array from tag and size of original array

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

### `getSortedUIDs`

Sort the array of instanceUIDs according to imageIds sorted using sortSeriesStack

#### Syntax

```typescript
getSortedUIDs(seriesData: Series):  {
    [key: string]: string;
}
```

#### Parameters

| Parameter    | Type   | Description                          |
| ------------ | ------ | ------------------------------------ |
| `seriesData` | Series | The dataset representing the series. |

#### Returns

`{[key: string]: string;}` - The sorted instanceUIDs

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

### `getReslicedMetadata`

Generates a random unique identifier.

```typescript
getReslicedMetadata(
  reslicedSeriesId: string,
  fromOrientation: "axial" | "coronal" | "sagittal",
  toOrientation: "axial" | "coronal" | "sagittal",
  seriesData: Series,
  imageLoaderName: string
): object[]
```

#### Parameters

| Parameter          | Type                               | Description                                        |
| ------------------ | ---------------------------------- | -------------------------------------------------- |
| `reslicedSeriesId` | string                             | The id of the resliced serie                       |
| `fromOrientation`  | "axial" or "coronal" or "sagittal" | Source orientation (eg axial, coronal or sagittal) |
| `toOrientation`    | "axial" or "coronal" or "sagittal" | Target orientation (eg axial, coronal or sagittal) |
| `seriesData`       | Series                             | The original series data                           |
| `imageLoaderName`  | string                             | The registered loader name                         |

#### Returns

```typescript
{
    imageIds: reslicedImageIds,
    instances: reslicedInstances,
    currentImageIdIndex: 0
  };
```

Used in `resliceSeries` to retrieve Cornerstone series object resliced from native orientation to coronal or sagittal orientation, filled only with metadata.

---

### `getReslicedPixeldata`

Generates a random unique identifier.

```typescript
getReslicedPixeldata(
  imageId: string,
  originalData: Series,
  reslicedData: Series
): TypedArray
```

#### Parameters

| Parameter      | Type   | Description                       |
| -------------- | ------ | --------------------------------- |
| `imageId`      | string | The id of the resulting image     |
| `originalData` | Series | The original series data (source) |
| `reslicedData` | Series | The resliced series data (target) |

#### Returns

`TypedArray` - A single resliced slice pixel array. Used in `resliceSeries` to retrieve pixel data for the resliced image from native orientation to coronal or sagittal orientation.

---

### `getDistanceBetweenSlices`

Generates a random unique identifier.

```typescript
getDistanceBetweenSlices (
  seriesData: Series,
  sliceIndex1: number,
  sliceIndex2: number
): number
```

#### Parameters

| Parameter     | Type   | Description            |
| ------------- | ------ | ---------------------- |
| `seriesData`  | Series | The series data        |
| `sliceIndex1` | number | The first slice index  |
| `sliceIndex2` | number | The second slice index |

#### Returns

`number` - Get distance between two slices. Used to get sliceThickness metadata.

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

---

### `getCmprMetadata`

Compute cmpr metadata from pyCmpr data (generated using [Scyther](https://github.com/dvisionlab/Scyther))

#### Syntax

```typescript
getCmprMetadata(
  reslicedSeriesId: string,
  imageLoaderName: string,
  header: any,
): {
    imageIds: reslicedImageIds,
    instances: reslicedInstances
  };
```

#### Parameters

| Parameter          | Type   | Description                                   |
| ------------------ | ------ | --------------------------------------------- |
| `reslicedSeriesId` | string | The id of the resliced serie                  |
| `imageLoaderName`  | string | The registered loader name                    |
| `header`           | any    | The header of the resliced serie from Scyther |

#### Returns

```typescript
{
    imageIds: reslicedImageIds,
    instances: reslicedInstances
};
```

Cornerstone series object, filled only with metadata

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
