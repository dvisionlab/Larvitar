<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# File Loader

The File Loader module provides functionalities for handling custom file loading in medical imaging workflows. It integrates with the [cornerstoneFileImageLoader](https://github.com/webnamics/cornerstoneFileImageLoader) to enable seamless loading of file-based DICOM images and supports advanced operations like resetting and clearing the loader state.

## Key Responsibilities

- **Custom File Image ID Generation:** Generates a custom image ID for files and array buffers to integrate with Cornerstone.
- **Loader State Management:** Provides functionality to reset the loader, clear caches, and free up memory.
- **Integration with File Manager:** Works in conjunction with the [File Manager](../managers/fileManager.md) to manage and retrieve file-based image IDs.
  
## How It Works

1. **Custom Image ID Generation:**
   - The `getFileCustomImageId` function handles both `File` and `ArrayBuffer` inputs.
   - It uses the `cornerstoneFileImageLoader` to generate and store a unique image ID.

2. **State Reset:**
    - Clears any rendered Cornerstone elements.
    - Resets the File Manager to remove all file-to-image ID mappings.
    - Clears cached images to free memory.
  
## Main Functions

### getFileCustomImageId

#### Syntax:

```typescript
getFileCustomImageId(data: File | ArrayBuffer): string
```

#### Parameters:

| Parameter	    | Type	               | Description                                                | 
|---------------|----------------------|------------------------------------------------------------|
| `data`	       | File or ArrayBuffer  | HTML5 file object or an ArrayBuffer containing the image.  | 

#### Returns: 

`string` – The custom image ID generated for the file or array buffer.

---

### resetFileLoader

#### Syntax:

```typescript
resetFileLoader(): void
```

#### Returns: 

`void` – Reset the file manager and clears the image cache.

<br></br>


<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>