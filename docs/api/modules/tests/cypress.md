<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Larvitar Examples Tests

The Larvitar Examples Tests represent a comprehensive suite of automated tests designed to validate the functionality of the Larvitar DICOM viewer across various specialized implementations. These tests ensure that each example component renders correctly, responds appropriately to user interactions, and maintains expected behavior across different DICOM visualization scenarios.
The example tests cover a wide range of functionality:

- Basic DICOM rendering and navigation
- Specialized medical imaging formats (ECG, DSA, multiframe)
- Advanced visualization features (color maps, 4D imaging)
- Interactive tools and controls
- PDF document handling
- Performance and responsiveness

Each test suite targets a specific example HTML page that demonstrates particular capabilities of the Larvitar viewer. 

## Base example
This section outlines Cypress tests for the `base.html` functionalities, ensuring the correct behavior of the Larvitar DICOM viewer.

### 1. Base HTML Loading and Setup
- Visits the `base.html` page.
- Ensures the viewer is visible.
- Waits for all files to load before proceeding.

### 2. Larvitar Manager Validation
- Checks that `Larvitar Manager` contains expected study data.
- Verifies series instance UID and image IDs.
- Ensures proper structure of image instances and current index tracking.

### 3. UI and Modal Interactions
- Verifies the page title.
- Ensures the viewer element is visible.
- Tests opening and closing of the code modal.
- Tests opening and closing of the metadata form.
- Toggles download options when selecting the checkbox.
- Displays metadata when the button is clicked.

### 4. Drag and Drop Functionality
- Tests file drag events.
- Simulates drag and drop of DICOM files.
- Ensures the spinner is visible during processing.

### 5. Viewer Interactions
- Tests `Wwwc` tool functionality for modifying contrast.
- Navigates between images using `Previous` and `Next` buttons.
- Scrolls through slices using the mouse wheel.
- Ensures metadata is displayed properly when the button is clicked.

### 6. Form Handling
- Opens the form and verifies form elements.
- Handles form inputs and checkbox interactions.


## Multiframe Rendering Tests
This section outlines Cypress tests for the `multiframe.html` functionalities, ensuring the correct behavior of the Larvitar multiframe DICOM viewer.

### 1. Base HTML Loading and Setup
- Visits the `multiframe.html` page.
- Ensures the viewer is visible.
- Waits for all files to load before proceeding.

### 2. Viewer Initial State
- Checks if the viewer starts with an initial frame.
- Ensures the frame rate and current frame information are displayed.

### 3. Frame Animation Control
- Tests playing and pausing the animation using the `p` key.
- Ensures the frame pauses and resumes correctly.

### 4. Web Worker Statistics Updates
- Verifies worker statistics are populated.
- Ensures the statistics update every second.

### 5. Frame Navigation
- Tests scrolling through frames using the mouse wheel.
- Ensures the displayed frame updates correctly after scrolling.

## 4D Tests

These tests ensure that users can navigate through medical images in both slice mode and frame mode, confirming that interactions work as expected.

### 1. Load the Viewer Properly

- The test ensures that the webpage loads correctly by checking for the visibility of #viewer.
- A custom global property (win.allFilesLoaded) is used to track whether all necessary files are loaded.

### 2. Testing Slices Mode

- The test checks if scrolling changes the displayed slice.
- The initial slice ID is recorded, then a wheel event is triggered.
- The new slice ID is checked to ensure it has changed.
- Additionally, the slice number is verified (#slicenum).

### 3. Testing Frames Mode

- A toggle button is clicked to switch from slice mode to frame mode.
- The animation mode is checked (#animation should indicate "Scroll Mode Active: Frames").
- Similar to slice mode, scrolling should update the frame.
- The new frame's time ID is verified (#image-time).

## DICOM PDF Rendering Tests

This section outlines Cypress tests for the `pdf.html` functionalities, ensuring the correct behavior of the Larvitar DICOM PDF viewer.

### 1. Base HTML Loading and Setup
- Visits the `pdf.html` page.
- Ensures the viewer is visible.
- Creates a custom hook that sets a global flag when DICOM PDF files are fully loaded.
- Waits for all files to load before proceeding with tests.
- Verifies that the loading spinner is hidden when rendering is complete.

### 2. Cornerstone Integration Validation
- Verifies that the viewport is visible.
- Ensures a proper delay to allow Cornerstone elements to initialize.
- Confirms that the Larvitar object exists and is accessible.
- Verifies that Larvitar Manager contains the expected study data.

### 3. PDF Page Management
- Checks that the Larvitar Manager properly loads the PDF document with the correct Series Instance UID.
- Verifies that the PDF document contains the expected number of pages (4 images).
- Validates that the image IDs are properly tracked in the Cornerstone stack.

### 4. Tool Activation
- Confirms that the Pan tool is activated by default for the PDF viewer.
- Uses the Cornerstone Tools API to verify the activation state.
- Ensures that the proper navigation tools are available for PDF interaction.

### 5. PDF Rendering Quality
- The tests ensure that Cornerstone properly handles the PDF document as a stack of image frames.
- Verifies that tools like Pan are correctly configured for PDF navigation and interaction.
## ECG Rendering Tests

This section outlines Cypress tests for the `ecg.html` functionalities, ensuring the correct behavior of the Larvitar ECG (Electrocardiogram) viewer.

### 1. Base HTML Loading and Setup
- Visits the `ecg.html` page.
- Ensures the viewer is visible.
- Creates a custom hook to track when ECG files are loaded by overriding the `renderImage` method.
- Waits for all files to load before proceeding with tests.
- Verifies that the loading spinner is hidden when rendering is complete.

### 2. Larvitar Manager Validation
- Verifies that the Larvitar object exists and is accessible.
- Validates that Larvitar Manager contains the expected series with the correct series instance UID.
- Confirms that ECG-specific plot containers exist in the DOM.
- Ensures the ECG data is properly defined in the Larvitar Manager.
- Checks that all 48 image IDs are properly loaded and formatted.
- Verifies that instances object exists and contains all expected images.
- Confirms that the manager tracks the current image index properly.

### 3. Viewer Initial State
- Checks if the viewer is visible and properly loaded.
- Ensures the frame rate information is displayed.
- Verifies that the current frame information is visible and accurate.

### 4. Frame Animation Control
- Tests playing and pausing the animation using the `p` key.
- Verifies the frame changes during playback.
- Confirms the animation can be paused and resumed correctly.
- Validates the current frame counter displays the correct frame number (e.g., "Current Frame: 10 of 48").

### 5. Statistics Updates
- Verifies that Web Worker statistics are populated and visible:
  - Maximum Web Workers
  - Number of active Web Workers
  - Queued tasks
  - Tasks currently executing
  - Total tasks executed
  - Task execution and delay times
- Ensures that statistics update regularly (every second).

### 6. Frame Navigation
- Tests scrolling through frames using the mouse wheel.
- Captures the initial frame state before scrolling.
- Simulates a wheel event on the viewer element.
- Confirms that the frame changes after the wheel event.
- Verifies the frame counter updates correctly.

### 7. Frame Rate Adjustment
- Tests the ability to increase frame rate using the "+" key.
- Captures the initial frame rate value.
- Simulates pressing the "+" key.
- Verifies that the new frame rate is higher than the initial value.
- Confirms that the frame rate display updates correctly.
## DSA Rendering Tests

This section outlines Cypress tests for the `dsa.html` functionalities, ensuring the correct behavior of the Larvitar Digital Subtraction Angiography (DSA) viewer.

### 1. Base HTML Loading and Setup
- Visits the `dsa.html` page.
- Ensures the viewer is visible.
- Creates a custom hook to track when DSA files are loaded by overriding the `renderImage` method.
- Waits for the viewer to be completely visible before proceeding with tests.

### 2. Image Snapshot Configuration
- Implements visual regression testing using the `cypress-image-snapshot` plugin.
- Configures snapshot comparison with:
  - 3% failure threshold for acceptable image differences
  - 0.1 threshold for pixel comparison sensitivity
  - Percentage-based failure threshold type for better handling of varied viewport sizes

### 3. DSA Mask Application
- Takes a baseline screenshot of the initial DSA image state.
- Simulates pressing the "2" key to trigger the DSA mask application.
- Allows time for the mask to be properly applied to the image.
- Takes a second screenshot to capture the state after mask application.
- Uses image comparison to verify the mask was correctly applied.
- Ensures visual differences match expected changes when the mask is active.

### 4. Frame Animation Control
- Provides sufficient time for the DSA viewer to fully initialize.
- Tests playing and pausing the animation using the `p` key.
- Captures the initial frame state before playback.
- Verifies the frame pauses at the expected position (Frame 1 of 13).
- Confirms that resuming playback changes the current frame.
- Validates that the animation control functions correctly for DSA sequences.

### 5. DSA-Specific Features
- Tests visual difference detection fundamental to DSA imaging.
- Verifies that the mask key ("2") properly activates the digital subtraction functionality.
- Ensures the frame counter correctly displays the DSA sequence length (13 frames).
- Utilizes image snapshots to confirm visual changes occur as expected with DSA processing.
## Color Maps Tests

This section outlines Cypress tests for the `colorMaps.html` functionalities, ensuring the correct behavior of the Larvitar DICOM viewer's color mapping capabilities.

### 1. Base HTML Loading and Setup
- Visits the `colorMaps.html` page.
- Ensures the viewer is loaded and ready for interaction.
- Does not require custom loading hooks as the test focuses on UI interaction rather than initial rendering.

### 2. Color Map Cycling
- Verifies that the initial color map is properly set and displayed as "Gray" in the UI.
- Confirms that the color map indicator element (`#active-color-map`) is present and showing the correct initial value.
- Ensures the Larvitar object exists and is accessible before proceeding with tests.

### 3. Keyboard Controls
- Tests the color map cycling functionality triggered by pressing the 'm' key.
- Simulates multiple keypresses (3 cycles) using the keyCode 109.
- Verifies after each keypress that:
  - The color map indicator updates to show a different color map name
  - The text format follows the expected pattern "Active Color Map: [Name]"
  - Each cycling action successfully changes the displayed color map

### 4. Visual Representation
- While not explicitly taking screenshots, the test ensures the UI elements accurately reflect the current state of the color map.
- Validates that the color map cycling functionality properly updates the display text that informs users about the active visualization mode.
- Confirms the integration between keyboard controls and the DICOM viewer's visualization system.

This test ensures that users can effectively cycle through different color maps to enhance visualization of DICOM images, providing different contrast options for better diagnostic viewing.
## Default Tools Tests

This section outlines Cypress tests for the `defaultTools.html` page, validating the Larvitar DICOM viewer's tool management functionality.

### 1. Page Loading and Setup
- Visits the default tools example page and waits for the viewer to become visible
- Implements a custom hook to track when DICOM files are completely loaded
- Waits for loading process to complete and spinner to disappear

### 2. Basic UI Elements
- Verifies correct page title contains "Larvitar - Default Tools example"
- Confirms viewer element visibility
- Checks that active tool indicator displays the default "Wwwc" tool
- Validates visibility of mouse button instruction text

### 3. Tool Switching
- Tests keyboard shortcut functionality by simulating key press ('t')
- Verifies tool changes appropriately from default to "WwwcRegion"
- Confirms the UI updates to reflect the active tool change

### 4. Interactive Zoom Testing
- Cycles through tools to activate the "Zoom" tool
- Captures initial viewport scale for comparison
- Simulates mouse drag operation (click, move, release)
- Verifies that viewport scale changes after zoom interaction
- Confirms the viewer correctly responds to user interaction

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>

