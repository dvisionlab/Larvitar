<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Kernel Convolution for Image Processing

Convolution is a fundamental operation in image processing that modifies an image by applying a mathematical operator called a **kernel**. A kernel is a small matrix of numbers that is passed over the entire image. The value of each pixel is recalculated based on the values of its neighbors, as defined by the kernel.

This technique allows for a wide variety of image filtering effects, such as:

  - **Blurring:** Averaging pixel values to create a smoother image.
  - **Sharpening:** Accentuating differences between pixels to enhance edges.
  - **Edge Detection:** Highlighting the boundaries between different regions of an image.
  - **Embossing:** Giving the image a raised, 3D appearance.

This module provides a robust framework for defining, managing, and applying convolution kernels to digital images.

## How It Works

The core of the functionality is a `convolve` algorithm that systematically applies the kernel to every pixel of the source image.

1.  The kernel is centered over a target pixel.
2.  Each value in the kernel is multiplied by the corresponding pixel value underneath it.
3.  All the products are summed up to get the new value for the target pixel.
4.  This process is repeated for every pixel in the image to produce the final filtered image.

Boundary conditions (for pixels at the image edges) are handled by clamping the coordinates, ensuring the kernel can operate on the entire image.

## API Reference

### `applyConvolutionFilter`

Applies a named convolution kernel from the kernel library to a given image. This is the primary function for executing a filtering operation.

#### Syntax

```typescript
applyConvolutionFilter(
  loadedImage: Image,
  filterName: string,
  generateImage: boolean = false,
  multiplier: number = 1
): Partial<Image> | TypedArray
```

#### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `loadedImage` | `Image` | The source image object to be filtered. |
| `filterName` | `string` | The name of the kernel to apply (e.g., `edgeDetect`). |
| `generateImage` | `boolean` | **Optional.** If `true`, returns a new `Image` object. If `false` (default), returns only the `TypedArray` of filtered pixel data. |
| `multiplier` | `number` | **Optional.** A scaling factor to apply to the kernel's values during convolution (default: `1`). |

#### Returns

`Partial<Image> | TypedArray` – Returns a new, partial `Image` object containing the filtered result, or the raw `TypedArray` of pixel data.

-----

### `addCustomKernel`

Adds a new, user-defined kernel to the global library of available filters, making it accessible to `applyConvolutionFilter`.

#### Syntax

```typescript
addCustomKernel(name: string, config: KernelConfig): void
```

#### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | A unique name to identify the new kernel. |
| `config` | `KernelConfig` | An object with the kernel's configuration: `{ Label: string, Size: number, Kernel: number[][] }`. |

#### Returns

`void`

#### Example

```typescript
// Define a 3x3 sharpening kernel
const sharpenConfig = {
  Label: "Sharpen 3x3",
  Size: 3,
  Kernel: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ]
};

// Add the kernel to the library with the name "sharpen"
addCustomKernel("sharpen", sharpenConfig);

// The "sharpen" filter can now be used
const sharpenedImage = applyConvolutionFilter(myImage, "sharpen", true);
```

-----

### `getKernels`

Retrieves the complete object containing all currently defined convolution kernels.

#### Syntax

```typescript
getKernels(): { [key: string]: KernelConfig }
```

#### Returns

`{ [key: string]: KernelConfig }` – A copy of the internal `CONVOLUTION_KERNELS` object.

-----

### `applyGaussianBlur`

Applies a Gaussian blur filter with dynamically generated kernel to a cornerstone image. This function generates the appropriate Gaussian kernel based on the specified parameters and applies it to create a smooth blurring effect.

#### Syntax

```typescript
applyGaussianBlur(
  loadedImage: Image,
  kernelSize: number,
  strength: number
): Partial<Image>
```

#### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `loadedImage` | `Image` | The source cornerstone image object to be blurred. |
| `kernelSize` | `number` | The size of the kernel (must be an odd number ≥ 3). |
| `strength` | `number` | The sigma value for the Gaussian function, controlling blur intensity. |

#### Returns

`Partial<Image>` – A new, partial `Image` object containing the blurred result.

#### Example

```typescript
// Apply a 5x5 Gaussian blur with sigma of 1.5
const blurredImage = applyGaussianBlur(myImage, 5, 1.5);
```

-----

### `applySharpening`

Applies a sharpening filter with dynamically generated kernel to a cornerstone image. This function creates an appropriate sharpening kernel based on the specified parameters to enhance edge definition and image clarity.

#### Syntax

```typescript
applySharpening(
  loadedImage: Image,
  kernelSize: number,
  strength: number
): Partial<Image>
```

#### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `loadedImage` | `Image` | The source cornerstone image object to be sharpened. |
| `kernelSize` | `number` | The size of the kernel (must be an odd number ≥ 3). |
| `strength` | `number` | The strength of the sharpening effect (higher values = more sharpening). |

#### Returns

`Partial<Image>` – A new, partial `Image` object containing the sharpened result.

#### Example

```typescript
// Apply a 3x3 sharpening filter with moderate strength
const sharpenedImage = applySharpening(myImage, 3, 0.8);
```

-----

### `createFilteredImage`

A utility function that constructs a new `Image` object from an array of filtered pixel data. It uses the original image as a template for metadata (e.g., dimensions, slope, intercept) and calculates new values for properties like `minPixelValue`, `maxPixelValue`, and `windowCenter`.

#### Syntax

```typescript
createFilteredImage(
  loadedImage: Image,
  filteredPixelArray: number[]
): Partial<Image>
```

#### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `loadedImage` | `Image` | The original image, used as a source for metadata. |
| `filteredPixelArray` | `number[]` | The array of pixel data for the new, filtered image. |

#### Returns

`Partial<Image>` – A new, partial `Image` object ready for rendering.

## Internal Functions

  - **`convolve`**: The core algorithm that performs the mathematical convolution. It iterates over image pixels, applies the kernel weights, and handles boundary logic.
  - **`getTypedArrayConstructor`**: A helper utility that inspects the input image's pixel data to select the correct `TypedArray` constructor (e.g., `Int16Array`, `Uint8Array`) for the output. This preserves the numerical precision and data type of the original image.
  - **`generateGaussianKernel`**: Generates a Gaussian kernel matrix for blurring operations based on size and sigma parameters.
  - **`generateSharpenKernel`**: Generates a sharpening kernel matrix based on size and strength parameters.

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>