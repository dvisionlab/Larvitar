<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# The GSPS Manager

The GSPS Manager Module handles the management of Grayscale Softcopy Presentation State (GSPS) references within DICOM datasets. It provides utilities to populate, retrieve, and reset a centralized dictionary that maps SOP Instance UIDs to their associated GSPS references.

## Key Responsibilities

- **Mapping GSPS References:** Links SOP Instance UIDs to an array of presentation states, including the series and image IDs where they are stored.
- **Efficient Retrieval:** Provides an interface to query GSPS references for a given SOP Instance UID.
- **Memory Management:** Includes a reset functionality to clear all stored GSPS references and free up memory.
  
## How It Works

1. **Populating the Manager:**
   - The populateGSPSManager function iterates through the instances in a series.
   - Extracts the Referenced Instance Sequence (x00081115) from the metadata.
   - Maps each SOPInstanceUID in the sequence to an array of presentation states (series ID and image ID).

2. **Querying GSPS References:**
   - Use getGSPSManager to retrieve the dictionary and query for specific SOPInstanceUID mappings.

3. **Resetting the Manager:**
   - Clears all mappings by nullifying references in the resetGSPSManager function.
  
## Main Functions

### populateGSPSManager

#### Syntax:

```typescript
populateGSPSManager(uniqueUID: string, seriesData: Series): void
```

#### Parameters:

| Parameter	    | Type	  | Description                                 | 
|---------------|---------|---------------------------------------------|
| `uniqueUID`	| string  | A unique identifier for the GSPS series.    | 
| `seriesData`	| Series  | The series data containing GSPS references. | 

#### Returns: 

`void` – Populates the GSPS Manager with the relevant mappings.

---

### getGSPSManager

#### Syntax:

```typescript
getGSPSManager(): Record<string, Array<{ seriesId: string, imageId: string }>>
```

#### Returns: 

`GSPSManager` – An object mapping SOP Instance UIDs to arrays of GSPS references.

---

### resetGSPSManager

#### Syntax:

```typescript
resetGSPSManager(): void
```

#### Returns: 

`void` – Clears all references stored in the GSPS Manager and frees up memory by nullifying series and image references.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>