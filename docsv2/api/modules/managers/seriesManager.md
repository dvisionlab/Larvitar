<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# The Series Manager

The Series Manager Module provides core functionalities for managing and loading DICOM data, including parsing, organizing, and storing series, instances, and associated metadata. It acts as a central store and utility set for handling DICOM imaging workflows.

## Key Responsibilities

- **DICOM Data Management:** Manages series, instances, and metadata for parsed DICOM files.
- **Custom Loader Integration:** Supports multiframe images, GSPS (Grayscale Softcopy Presentation State), and image frame extraction.
- **Memory Management:** Handles resetting, cleaning, and efficient storage of large datasets.
- **Image Tracker:** Maps image IDs to series for efficient retrieval.
- **Metadata Access:** Allows querying of series, instances, and image metadata.

### Image Tracker

The `Image Tracker` is a utility within the Series Manager ecosystem that maps image IDs to their associated series. It is primarily used for efficient tracking and retrieval of images across series, enabling streamlined workflows for parsing, loading, and managing DICOM data.

The Image Tracker serves as a lookup table to:

  - **Map Image IDs to Series:** Tracks which series each image belongs to.
  - **Enhance Performance:** Enables quick retrieval of series information for a given image ID.
  - **Facilitate Series Management:** Supports series-specific operations by associating images with their respective series.

1. **Mapping Image IDs to Series:**

   - Each `imageId` is mapped to the corresponding `uniqueUID`.

2. **Dynamic Updates:**

   - The tracker is updated dynamically during parsing and series loading workflows.

3. **Integration with Series Management:**

   - The tracker is seamlessly integrated with the `Series Manager` for series-based operations.

## Main Functions

### updateSeriesManager

Updates and initializes the Series Manager to parse and load a single DICOM object.

#### Syntax:

```typescript
updateSeriesManager(
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
): SeriesManager
```

#### Parameters:

| Parameter	      | Type	            | Description                                         | 
|-----------------|--------------------|-----------------------------------------------------|
| `imageObject`	| ImageObject	      | A single DICOM object containing metadata and data. | 
| `customId`	   | string	(Optional)  | Custom ID to overwrite the default seriesUID.       | 
| `sliceIndex`	   | number	(Optional)  | Index to overwrite default slice ordering.          |    

#### Returns: 

`SeriesManager` – The updated Series Manager.

---

### populateSeriesManager
Populates the Series Manager with a specific series.

#### Syntax:

```typescript
populateSeriesManager(
  uniqueUID: string,
  seriesData: Series
): SeriesManager
```

#### Parameters:

| Parameter	        | Type    | Description                   | 
|-------------------|---------|-------------------------------|
| `uniqueUID`	      | string	| The unique ID for the series. | 
| `seriesData`	    | string  | Data to populate.             | 

#### Returns: 

`SeriesManager` – The updated Series Manager with added series.

---

### getSeriesManager
Retrieves the Series Manager, initializing it if necessary.

#### Syntax:

```typescript
getSeriesManager(): SeriesManager
``` 
#### Returns: 

`SeriesManager` – The current manager object.

---

### resetSeriesManager
Resets the Series Manager, clearing all stored series, instances, and metadata.

#### Syntax:

```typescript
resetSeriesManager(): void
``` 

---

### removeSeriesFromSeriesManager
Removes a specific series from the Series Manager.

#### Syntax:

```typescript
removeSeriesFromSeriesManager(seriesId: string): void
```

#### Parameters:

| Parameter	   | Type    | Description                   | 
|--------------|---------|-------------------------------|
| `seriesId`	| string	 | The unique ID for the series. | 

---

### getSeriesDataFromSeriesManager
Retrieves the data for a specific series.

#### Syntax:

```typescript
getSeriesDataFromSeriesManager(seriesId: string): Series | null
```

#### Parameters:

| Parameter	   | Type    | Description                   | 
|--------------|---------|-------------------------------|
| `seriesId`	| string	 | The unique ID for the series. | 

#### Returns: 

`Series` – The series data, or `null` if not found.

---

### getSopInstanceUIDFromSeriesManager
Return the SOP Instance UID of a specific imageId stored in the Series Manager.

#### Syntax:

```typescript
getSopInstanceUIDFromSeriesManager(uniqueUID:string, imageId: string): string | null
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