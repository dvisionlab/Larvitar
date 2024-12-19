<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Multiframe Loader

The Multiframe Loader Module is a custom DICOM loader specifically designed to handle multiframe images. It enables efficient parsing, caching, and rendering of individual frames from multiframe datasets, seamlessly integrating with the `cornerstoneDICOMImageLoader` ecosystem.

## Key Responsibilities

- **Loading Multiframe Images:** Provides custom logic to load individual frames from multiframe DICOM datasets.
- **Caching:** Implements an internal cache to optimize performance by avoiding repeated parsing of the dataset.
- **Integration with Series Management:** Works with the [Image Manager](../managers/imageManager.md) to organize and retrieve frame-specific metadata and pixel data.
- **Custom Image Creation:** Generates Cornerstone-compatible image objects for rendering frames.
- **DSA Integration:** Supports Digital Subtraction Angiography (DSA) images for specialized visualization.
  
## Internal Workflow

1. **Dataset Parsing:**
   - Metadata for each frame is parsed and stored in the [Image Manager](../managers/imageManager.md).
2. **Image ID Management:**
    - Custom image IDs are generated for each frame in the series
3. **Frame Caching:**
    - Frames are cached to avoid re-parsing the dataset for subsequent requests.
4. **Custom Image Creation:**
    - Each frame is processed into a Cornerstone-compatible image object, including pixel data extraction and scaling.

## Main Functions

### loadMultiFrameImage

#### Syntax:

```typescript
loadMultiFrameImage(imageId: string): ImageLoadObject
```

#### Parameters:

| Parameter	| Type	 | Description                              | 
|-----------|--------|------------------------------------------|
| `imageId`	| string | The ID of the image/frame to be loaded.  | 

#### Returns: 

`ImageLoadObject` – An object containing a Promise that resolves to the loaded image.

---

### buildMultiFrameImage

#### Syntax:

```typescript
buildMultiFrameImage(uniqueUID: string, serie: Series): void
```

#### Parameters:

| Parameter	    | Type	 | Description                                    | 
|---------------|--------|------------------------------------------------|
| `uniqueUID`   | string | A unique identifier for the multiframe series. | 
| `serie`	    | Series | The parsed series object.                      | 

#### Returns: 

`void` – Parses metadata for each frame in the series and generates frame-specific image IDs and organizes metadata.

---

### getMultiFrameImageId

#### Syntax:

```typescript
getMultiFrameImageId(customLoaderName: string): string
```

#### Parameters:

| Parameter	         | Type	  | Description                          | 
|--------------------|--------|--------------------------------------|
| `customLoaderName` | string | The name of the custom image loader. | 

#### Returns: 

`string` – A unique image ID for the loader.

---

### clearMultiFrameCache

#### Syntax:

```typescript
clearMultiFrameCache(seriesId: string): void
```

#### Parameters:

| Parameter	 | Type	  | Description                                    | 
|------------|------- |------------------------------------------------|
| `seriesId` | string | The ID of the series to clear from the cache.  | 

#### Returns: 

`void` – Clears the cache for multiframe datasets.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>