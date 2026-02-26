<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Single Frame Loader

The singleFrameLoader module is a custom DICOM loader designed to cache and render a single frame buffer with its metadata. It enables efficient retrieval and display of single-frame images extracted from multi-frame DICOM objects.

## Key Responsibilities

- **Caches pixel data and metadata for quick access:** Stores pixel data and metadata for single-frame images in an internal cache to optimize performance.
- **Clears cached frames to free memory:** Removes cached frames from memory to prevent memory leaks and optimize performance.
- **Creates custom image objects for rendering:** Generates Cornerstone-compatible image objects for rendering single-frame images.

## Internal Workflow

1. **Metadata Conversion:**
   - Metadata for the single frame is converted and stored in the [Image Manager](../managers/imageManager.md).
2. **Image ID Management:**
    - Custom image IDs are generated for each single frame.
3. **Frame Caching:**
    - Single frames are cached to avoid subsequent requests.
4. **Custom Image Creation:**
    - The single frame is processed into a Cornerstone-compatible image object, including pixel data extraction and scaling.
5. **Memory Management:**
    - Cached frames are cleared from memory to optimize performance and prevent memory leaks.

## Main Functions

### getSingleFrameCache

#### Syntax:

```typescript
getSingleFrameCache(imageId?: string): { [key: string]: SingleFrameCache }
```

#### Parameters:

| Parameter	 | Type	              | Description                              |
|------------|--------------------|------------------------------------------|
| `imageId`	 | string             | The ID of the cached single frame.       |

#### Returns:

`[key: string]: SingleFrameCache` – An object containing the cached single frame data and metadata. If no ID is provided, returns all cached frames.

---

### setSingleFrameCache

#### Syntax:

```typescript
setSingleFrameCache(data: Uint8ClampedArray, metadata: Metadata): ImageObject
```

#### Parameters:

| Parameter	 | Type	              | Description                              |
|------------|--------------------|------------------------------------------|
| `data`	 | Uint8ClampedArray  | The pixel data for the single frame.     |
| `metadata` | Metadata	          | The metadata object.                     |

#### Returns:

`ImageObject` – An object containing the ID of the cached single frame, its metadata and its SOP Instance UID.

---

### clearSingleFrameCache

#### Syntax:

```typescript
clearSingleFrameCache(imageId?: string): void
```

#### Parameters:

| Parameter	 | Type	   | Description                                    |
|------------|----------|-----------------------------------------------|
| `imageId`	 | string   | Optional ID of the single frame to be cleared.|

#### Returns:
`void` – Clears the cached single frame from memory. If no ID is provided, all cached frames are cleared.

---

### loadSingleFrameImage

#### Syntax:

```typescript
loadSingleFrameImage(imageId: string): ImageLoadObject
```

#### Parameters:

| Parameter	| Type	 | Description                              |
|-----------|--------|------------------------------------------|
| `imageId`	| string | The ID of the image/frame to be loaded.  |

#### Returns:

`ImageLoadObject` – An object containing a Promise that resolves to the loaded image.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>