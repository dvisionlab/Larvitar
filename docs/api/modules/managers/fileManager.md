<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# The File Manager

The File Manager module is a utility that handles the management of files or array buffers used in medical imaging workflows. It is based on the functionality of [cornerstoneFileImageLoader](https://github.com/webnamics/cornerstoneFileImageLoader) and extends its capabilities to efficiently manage and retrieve image data using a unique identifier.

## Key Responsibilities

- **File Management:** Tracks and stores files or array buffers using unique identifiers..
- **Image Id Retrieval:** Associates each file with a custom image ID for quick access during visualization.
- **Reset Functionalities:** Provides a mechanism to reset and clear the file manager, freeing up memory when needed..
  
## How It Works

1. **File Identification:**
   - Each file is identified by its `webkitRelativePath` or `name`. For ArrayBuffer inputs, a unique ID is generated.

2. **Custom Image Ids:**
   - The `getFileCustomImageId` function generates an image ID for each file, which is stored in the manager..

3. **Storage and Retrieval:**
   - The File Manager maintains a mapping of file UUIDs to image IDs for efficient retrieval during imaging workflows..
  
## Main Functions

### populateFileManager

#### Syntax:

```typescript
populateFileManager(data: File | ArrayBuffer): void
```

#### Parameters:

| Parameter	    | Type	               | Description                                                | 
|---------------|----------------------|------------------------------------------------------------|
| `data`	       | File or ArrayBuffer  | HTML5 file object or an ArrayBuffer containing the image.  | 

#### Returns: 

`void` – Populates the File Manager with the relevant mappings.

---

### getFileManager

#### Syntax:

```typescript
getFileManager(): Record<string, string>
```

#### Returns: 

`FileManager` – An object mapping unique identifiers (UUIDs) to custom image IDs.

---

### getDataFromFileManager

#### Syntax:

```typescript
getDataFromFileManager(data: File | string): string | null
```

#### Parameters:

| Parameter	    | Type	         | Description                      | 
|---------------|----------------|----------------------------------|
| `data`	       | File or String | HTML5 file object or unique Id.  | 

#### Returns: 

- `string` – The custom image ID associated with the file
- `null` – If the file is not found in the manager.
  
---

### resetFileManager

#### Syntax:

```typescript
resetFileManager(): void
```

#### Returns: 

- `void` – Clears all entries in the file manager and frees memory by nullifying the manager.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>