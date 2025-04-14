# Changelog

## [3.4.0] - 2025-04-15

🚀 Key Changes:

- `csToolsCreateStack` and `csToolsSyncStack` now accept `elementId` as target html element or its string id.
- `addDefaultTools` now accepts `elementId` as target html element or its string id and is no more optional.
- `csToolsCreateStack` is no longer called during rendering process.
- `disableViewport` now removes `seriesUID` from the stored viewport.

**New Feature:** `addDefaultTools` now includes `csToolsCreateStack` by default.
  
**Deprecated Aliases for Backward Compatibility**:
  - `csToolsUpdateImageIds → csToolsSyncStack`


## [3.3.0] - 2025-03-21

🚀 Key Changes:

- `renderImage` now accepts an optional `RenderProps` object for more flexible rendering options.

**New Feature:** Added support for advanced rendering options, such as `scale`, `rotation`, `voi`, and `colormap`, directly through the `RenderProps` object.  

**Deprecated parameter removed:** The `defaultProps` parameter has been replaced by the new `RenderProps` object.

## [3.2.0] - 2025-03-17

🚀 Key Changes:
- `updateImage` is now deprecated:
  - The method `updateImage` should no longer be used and will be removed in future versions.

- `renderImage` is now the single rendering method:
  - All functionalities previously handled by `updateImage` are now integrated into `renderImage`, which becomes the standard method for image rendering.

**Deprecated Aliases for Backward Compatibility**:
  - `updateImage → renderImage`


## [3.1.0] - 2025-03-03

🚀 Features Added:
- Integrated Consola as the logging library for improved browser compatibility.
- Logs are now colorized, formatted, and prefixed with [larvitar] for consistency.
- Preserves correct file & line numbers in browser console.

## [3.0.0] - 2025-02-23

### ⚠️ Breaking Changes
- **Renamed `larvitarSeriesInstanceUID` to `uniqueUID`** across the codebase.
- **Updated `renderImage` signature**:
  - **Old**:
    ```ts
    renderImage(seriesStack: Series, elementId: string | HTMLElement, defaultProps: StoreViewportOptions)
    ```
  - **New**:
    ```ts
    renderImage(seriesStack: Series, elementId: string | HTMLElement, options?: { defaultProps?: StoreViewportOptions; cached?: boolean; })
    ```
- **Deprecated Aliases for Backward Compatibility**:
  - `updateLarvitarManager → updateImageManager`
  - `populateLarvitarManager → populateImageManager`
  - `getLarvitarManager → getImageManager`
  - `resetLarvitarManager → resetImageManager`
  - `removeSeriesFromLarvitarManager → removeDataFromImageManager`
  - `getSeriesDataFromLarvitarManager → getDataFromImageManager`
  - `getSopInstanceUIDFromLarvitarManager → getSopInstanceUIDFromImageManager`
  - `getLarvitarImageTracker → getImageTracker`
  - `populateInstanceGSPSDict → populateGSPSManager`
  - `getInstanceGSPSDict → getGSPSManager`
  - `resetInstanceGSPSDict → resetGSPSManager`
  - `getFileImageId → getDataFromFileManager`

### 🛠 New Features
- Added support for optional caching in `renderImage` via `options.cached`.

### 📝 Deprecations
- Deprecated aliases will trigger a **console warning** when used.
