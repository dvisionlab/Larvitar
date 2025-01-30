# DSA Loader Module

The **DSA Loader Module** is a specialized DICOM loader designed to handle **Digital Subtraction Angiography (DSA) images**. This module enables efficient parsing, caching, and rendering of DSA frames while integrating seamlessly with the `cornerstoneDICOMImageLoader` ecosystem.

## Key Responsibilities

- **Custom DSA Image Loading:** Implements logic to load and process DSA image frames.
- **Pixel Shift Application:** Supports pixel shift operations for improved DSA visualization.
- **Series Management:** Works with the [Image Manager](../managers/imageManager.md) to manage and retrieve DSA metadata.
- **Efficient Caching:** Avoids redundant dataset parsing by utilizing an internal cache.
- **Cornerstone Integration:** Generates Cornerstone-compatible images for seamless rendering.

## Internal Workflow

1. **Image Parsing & Retrieval:**
   - Extracts image metadata from the Image Manager.
2. **Image ID Assignment:**
   - Generates unique image IDs for each frame.
3. **Pixel Data Processing:**
   - Applies pixel shifts and processes pixel values.
4. **Custom Image Creation:**
   - Converts processed frames into Cornerstone-compatible images.

## Main Functions

### loadDsaImage

#### Syntax:

```typescript
loadDsaImage(imageId: string): ImageLoadObject
```

#### Parameters:

| Parameter | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| `imageId` | string | The ID of the DSA image to be loaded. |

#### Returns:

`ImageLoadObject` – An object containing a Promise that resolves to the loaded image.

---

### populateDsaImageIds

#### Syntax:

```typescript
populateDsaImageIds(uniqueUID: string): void
```

#### Parameters:

| Parameter   | Type   | Description                                   |
| ----------- | ------ | --------------------------------------------- |
| `uniqueUID` | string | A unique identifier for the DSA image series. |

#### Returns:

`void` – Populates DSA image IDs for a given series.

---

### setPixelShift

#### Syntax:

```typescript
setPixelShift(pixelShift: number[] | undefined): void
```

#### Parameters:

| Parameter    | Type                  | Description                                  |
| ------------ | --------------------- | -------------------------------------------- |
| `pixelShift` | number[] \| undefined | The pixel shift array applied to DSA images. |

#### Returns:

`void` – Sets the pixel shift values for DSA processing.

---

### getDsaImageId

#### Syntax:

```typescript
getDsaImageId(customLoaderName: string): string
```

#### Parameters:

| Parameter          | Type   | Description                          |
| ------------------ | ------ | ------------------------------------ |
| `customLoaderName` | string | The name of the custom image loader. |

#### Returns:

`string` – A unique image ID generated for the DSA loader.

---

### createCustomImage

#### Syntax:

```typescript
createCustomImage(imageId: string, srcImage: Image, pixelData: number[]): ImageLoadObject
```

#### Parameters:

| Parameter   | Type     | Description                                 |
| ----------- | -------- | ------------------------------------------- |
| `imageId`   | string   | The unique identifier for the DSA image.    |
| `srcImage`  | Image    | The original source image object.           |
| `pixelData` | number[] | The processed pixel data for the DSA image. |

#### Returns:

`ImageLoadObject` – A Cornerstone-compatible image object.

---

## Conclusion

The **DSA Loader Module** provides an efficient, optimized, and structured approach for handling Digital Subtraction Angiography images. By leveraging caching, pixel shift correction, and seamless Cornerstone integration, it ensures smooth performance and high-quality visualization of DSA datasets.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
