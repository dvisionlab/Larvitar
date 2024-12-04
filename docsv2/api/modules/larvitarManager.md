<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# The Larvitar Manager

The Larvitar Manager Module provides core functionalities for managing and loading DICOM data, including parsing, organizing, and storing series, instances, and associated metadata. It acts as a central store and utility set for handling DICOM imaging workflows.

## Key Responsibilities

- **DICOM Data Management:** Manages series, instances, and metadata for parsed DICOM files.
- **Custom Loader Integration:** Supports multiframe images, GSPS (Grayscale Softcopy Presentation State), and image frame extraction.
- **Memory Management:** Handles resetting, cleaning, and efficient storage of large datasets.
- **Image Tracker:** Maps image IDs to series for efficient retrieval.
- **Metadata Access:** Allows querying of series, instances, and image metadata.

### Image Tracker

The `Image Tracker` is a utility within the Larvitar Manager ecosystem that maps image IDs to their associated series. It is primarily used for efficient tracking and retrieval of images across series, enabling streamlined workflows for parsing, loading, and managing DICOM data.

The Image Tracker serves as a lookup table to:

  - **Map Image IDs to Series:** Tracks which series each image belongs to.
  - **Enhance Performance:** Enables quick retrieval of series information for a given image ID.
  - **Facilitate Series Management:** Supports series-specific operations by associating images with their respective series.

1. **Mapping Image IDs to Series:**

   - Each `imageId` is mapped to the corresponding `larvitarSeriesInstanceUID`.

2. **Dynamic Updates:**

   - The tracker is updated dynamically during parsing and series loading workflows.

3. **Integration with Series Management:**

   - The tracker is seamlessly integrated with the `Larvitar Manager` for series-based operations.

## Main Functions

### updateLarvitarManager

Updates and initializes the Larvitar Manager to parse and load a single DICOM object.

#### Syntax:

```typescript
updateLarvitarManager(
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
): LarvitarManager
```

#### Parameters:

| Parameter	      | Type	            | Description                                         | 
|-----------------|--------------------|-----------------------------------------------------|
| `imageObject`	| ImageObject	      | A single DICOM object containing metadata and data. | 
| `customId`	   | string	(Optional)  | Custom ID to overwrite the default seriesUID.       | 
| `sliceIndex`	   | number	(Optional)  | Index to overwrite default slice ordering.          |    

#### Returns: 

`LarvitarManager` – The updated Larvitar Manager.

---

### populateLarvitarManager
Populates the Larvitar Manager with a specific series.

#### Syntax:

```typescript
populateLarvitarManager(
  larvitarSeriesInstanceUID: string,
  seriesData: Series
): LarvitarManager
```

#### Parameters:

| Parameter	                  | Type    | Description                   | 
|-----------------------------|---------|-------------------------------|
| `larvitarSeriesInstanceUID`	| string	 | The unique ID for the series. | 
| `seriesData`	               | string  | Data to populate.             | 

#### Returns: 

`LarvitarManager` – The updated Larvitar Manager with added series.

---

### getLarvitarManager
Retrieves the Larvitar Manager, initializing it if necessary.

#### Syntax:

```typescript
getLarvitarManager(): LarvitarManager
``` 
#### Returns: 

`LarvitarManager` – The current manager object.

---

### resetLarvitarManager
Resets the Larvitar Manager, clearing all stored series, instances, and metadata.

#### Syntax:

```typescript
resetLarvitarManager(): void
``` 

---

### removeSeriesFromLarvitarManager
Removes a specific series from the Larvitar Manager.

#### Syntax:

```typescript
removeSeriesFromLarvitarManager(seriesId: string): void
```

#### Parameters:

| Parameter	   | Type    | Description                   | 
|--------------|---------|-------------------------------|
| `seriesId`	| string	 | The unique ID for the series. | 

---

### getSeriesDataFromLarvitarManager
Retrieves the data for a specific series.

#### Syntax:

```typescript
getSeriesDataFromLarvitarManager(seriesId: string): Series | null
```

#### Parameters:

| Parameter	   | Type    | Description                   | 
|--------------|---------|-------------------------------|
| `seriesId`	| string	 | The unique ID for the series. | 

#### Returns: 

`Series` – The series data, or `null` if not found.

---

### getSopInstanceUIDFromLarvitarManager
Return the SOP Instance UID of a specific imageId stored in the Larvitar Manager.

#### Syntax:

```typescript
getSopInstanceUIDFromLarvitarManager(larvitarSeriesInstanceUID:string, imageId: string): string | null
```

#### Parameters:

| Parameter	                  | Type    | Description                   | 
|-----------------------------|---------|-------------------------------|
| `larvitarSeriesInstanceUID`	| string	 | The unique ID for the series. | 
| `imageId`	                  | string	 | The unique ID for the image.  |

#### Returns: 

`SopInstanceUID` – The SOP Instance UID of the image, or `null` if not found.

---

### getLarvitarImageTracker
Retrieves the image tracker that maps image IDs to series.

#### Syntax:

```typescript
getLarvitarImageTracker(): ImageTracker
```

#### Returns: 

`ImageTracker` – The current image tracker.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>