<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# The Image Manager

The Image Manager Module provides core functionalities for managing and loading DICOM data, including parsing, organizing, and storing series, instances, and associated metadata. It acts as a central store and utility set for handling DICOM imaging workflows.

## Key Responsibilities

- **DICOM Data Management:** Manages series, instances, and metadata for parsed DICOM files.
- **Custom Loader Integration:** Supports multiframe images, GSPS (Grayscale Softcopy Presentation State), and image frame extraction.
- **Memory Management:** Handles resetting, cleaning, and efficient storage of large datasets.
- **Image Tracker:** Maps image IDs to series for efficient retrieval.
- **Metadata Access:** Allows querying of series, instances, and image metadata.

### Image Tracker

The `Image Tracker` is a utility within the Image Manager ecosystem that maps image IDs to their associated series. It is primarily used for efficient tracking and retrieval of images across series, enabling streamlined workflows for parsing, loading, and managing DICOM data.

The Image Tracker serves as a lookup table to:

  - **Map Image IDs to Series:** Tracks which series each image belongs to.
  - **Enhance Performance:** Enables quick retrieval of series information for a given image ID.
  - **Facilitate Series Management:** Supports series-specific operations by associating images with their respective series.

1. **Mapping Image IDs to Series:**

   - Each `imageId` is mapped to the corresponding `uniqueUID`.

2. **Dynamic Updates:**

   - The tracker is updated dynamically during parsing and series loading workflows.

3. **Integration with Series Management:**

   - The tracker is seamlessly integrated with the `Image Manager` for series-based operations.

## Main Functions

### updateImageManager

Updates and initializes the Image Manager to parse and load a single DICOM object.

#### Syntax:

```typescript
updateImageManager(
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
): ImageManager
```

#### Parameters:

| Parameter	      | Type	              | Description                                         | 
|-----------------|---------------------|-----------------------------------------------------|
| `imageObject`	  | ImageObject	        | A single DICOM object containing metadata and data. | 
| `customId`	    | string	(Optional)  | Custom ID to overwrite the default seriesUID.       | 
| `sliceIndex`	  | number	(Optional)  | Index to overwrite default slice ordering.          |    

#### Returns: 

`ImageManager` – The updated Image Manager.

---

### populateImageManager
Populates the Image Manager with a specific dicom dataset.

#### Syntax:

```typescript
populateImageManager(
  uniqueUID: string,
  seriesData: Series
): ImageManager
```

#### Parameters:

| Parameter	        | Type    | Description                    | 
|-------------------|---------|--------------------------------|
| `uniqueUID`	      | string	| The unique ID for the dataset. | 
| `seriesData`	    | string  | Data to populate.              | 

#### Returns: 

`ImageManager` – The updated Image Manager with added dicom dataset.

---

### getImageManager
Retrieves the Image Manager, initializing it if necessary.

#### Syntax:

```typescript
getImageManager(): ImageManager
``` 
#### Returns: 

`ImageManager` – The current Image manager object.

---

### resetImageManager
Resets the Image Manager, clearing all stored datasets and metadata.

#### Syntax:

```typescript
resetImageManager(): void
``` 

---

### removeDataFromImageManager
Removes a specific dataset from the Image Manager.

#### Syntax:

```typescript
removeDataFromImageManager(uniqueUID: string): void
```

#### Parameters:

| Parameter	   | Type    | Description                    | 
|--------------|---------|--------------------------------|
| `uniqueUID`	 | string	 | The unique ID for the dataset. | 

---

### getDataFromImageManager
Retrieves the data for a specific dataset.

#### Syntax:

```typescript
getDataFromImageManager(uniqueUID: string): Series | null
```

#### Parameters:

| Parameter	   | Type    | Description                   | 
|--------------|---------|-------------------------------|
| `uniqueUID`	 | string	 | The unique ID for the series. | 

#### Returns: 

`Series` – The series data, or `null` if not found.

---

### getSopInstanceUIDFromImageManager
Return the SOP Instance UID of a specific imageId stored in the Image Manager.

#### Syntax:

```typescript
getSopInstanceUIDFromImageManager(uniqueUID:string, imageId: string): string | null
```

#### Parameters:

| Parameter	        | Type    | Description                   | 
|-------------------|---------|-------------------------------|
| `uniqueUID`	      | string	| The unique ID for the series. | 
| `imageId`	        | string	| The unique ID for the image.  |

#### Returns: 

`SopInstanceUID` – The SOP Instance UID of the image, or `null` if not found.

---

### getImageTracker
Retrieves the image tracker that maps image IDs to series.

#### Syntax:

```typescript
getImageTracker(): ImageTracker
```

#### Returns: 

`ImageTracker` – The current image tracker.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>