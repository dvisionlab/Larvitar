# Changelog

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
