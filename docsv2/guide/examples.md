# Larvitar Examples

Explore these [examples](https://larvitar.dvisionlab.com/examples/index.html) to learn how to use Larvitar for various medical imaging tasks. Each example demonstrates a specific functionality, making it easy to get started and see Larvitar in action.

---

## Examples List

### 1. Basic Viewer Setup

Learn how to set up a simple viewer using Larvitar’s core functionalities. This example covers initialization, loading an image, and basic viewer controls.

In this example you can also:
- inspect the metadata of the loaded image
- change some metadata of the loaded image
- drag and drop an image to the viewer

[View Example ➔](https://larvitar.dvisionlab.com/examples/base.html)

---

### 2. Multiframe Cine Loop (US and XA) Images

This example demonstrates how to handle multiframe cine loop images, specifically for ultrasound (US) and X-ray angiography (XA) imaging modalities, within Larvitar. 
Cine loop functionality enables users to play through a sequence of frames, simulating real-time imaging, which is essential for dynamic assessments in clinical workflows.

Key features covered in this example include:
- Loading and displaying multiframe US and XA images with web-workers
- Playing, pausing, and looping through frames to simulate real-time motion
- Adjusting playback speed and direction for detailed examination

[View Example ➔](https://larvitar.dvisionlab.com/examples/multiframe.html)

---

### 3. Comprehensive Toolset: Cornerstone Tools and Custom Tools

This example demonstrates how to integrate and use the full range of **Cornerstone Tools** available in Larvitar, along with some custom tools developed specifically for enhanced functionality. This example is ideal for users looking to maximize interactivity and customization in medical imaging workflows, providing tools for measurement, annotation, and specialized interactions.

Key features covered in this example include:
- Setup and usage of standard Cornerstone tools such as length, angle, and area measurement, zoom, pan, and scroll
- Applying annotation and ROI (Region of Interest) tools for detailed image analysis
- Implementing custom tools tailored to specific imaging requirements, such as specialized interaction modes or unique visualization functions

[View Example ➔](https://larvitar.dvisionlab.com/examples/defaultTools.html)

---

### 4. Segmentation Tools: Brush, Scissors, and More

This example demonstrates the use of Larvitar’s segmentation tools, including brush, scissors, and other interactive tools designed to help identify and isolate regions of interest in medical images. Segmentation tools are essential for defining specific structures within an image, making this example ideal for tasks that require detailed anatomical analysis.

Key features covered in this example include:
- Using the **brush tool** for freehand segmentation, allowing users to paint regions of interest
- Applying the **scissors tool** to cut out or refine segmented areas with precision
- Exploring other tools, such as eraser and lasso, to enhance control over segmented areas
- Saving and exporting segmented regions for further analysis or use in workflows

[View Example ➔](https://larvitar.dvisionlab.com/examples/segmentationTools.html)

---

### 5. X-ray Angiography (XA) and ECG Synchronization with Cardiac Trace

This example demonstrates how to synchronize X-ray angiography (XA) imaging with ECG (electrocardiogram) data, allowing for simultaneous visualization of cardiac motion and electrical activity. This synchronized playback provides valuable insights in cardiology, enabling clinicians and researchers to observe the heart's function in real time while tracking the corresponding ECG trace.

Key features covered in this example include:
- Loading and displaying XA images alongside ECG data
- Synchronizing image playback with the cardiac ECG trace
- Adjusting playback to analyze specific phases of the cardiac cycle
- Enhancing diagnostic accuracy by correlating imaging and ECG data

[View Example ➔](https://larvitar.dvisionlab.com/examples/ecg.html)

---

### 6. 4D MRI Support

This example demonstrates how to load and visualize 4D MRI data in Larvitar. 4D MRI enables time-resolved imaging, which is particularly useful for assessing dynamic processes such as blood flow or cardiac motion. This example walks through the steps to handle and animate 4D MRI datasets, providing tools to analyze temporal changes within the anatomy.

Key features covered in this example include:
- Loading 4D MRI data and parsing time-resolved frames
- Playing, pausing, and looping through temporal frames to simulate real-time visualization
- Adjusting playback speed for detailed analysis of dynamic processes
- Synchronizing time frames with other imaging data or physiological signals, if available

[View Example ➔](https://larvitar.dvisionlab.com/examples/4d.html)

---

### 7. PDF DICOM Support

This example demonstrates how to load and display PDF files embedded in DICOM format using Larvitar. Many radiology reports, scanned documents, and additional patient information are stored as PDFs within DICOM files, making it essential to support viewing these non-image DICOM data types alongside traditional imaging data.

Key features covered in this example include:
- Loading DICOM files that contain embedded PDFs
- Rendering PDFs within the viewer to display reports or documents
- Navigating multi-page PDFs and integrating them into imaging workflows
- Synchronizing PDF display with other DICOM images for comprehensive review

[View Example ➔](https://larvitar.dvisionlab.com/examples/pdf.html)

---

### 8. Visualization and Editing of Mask Layers

This example demonstrates how to visualize and edit mask layers in Larvitar. Mask layers are essential for highlighting specific regions, such as lesions or anatomical structures, within medical images. This example covers the steps to load, overlay, and modify mask layers, offering users precise control over segmentation and region-of-interest (ROI) management.

Key features covered in this example include:
- Loading and visualizing mask layers on top of medical images
- Adjusting opacity, color, and positioning of masks for optimal clarity
- Using editing tools, such as brush and eraser, to refine mask boundaries
- Saving and exporting edited mask layers for further analysis or use in clinical workflows

[View Example ➔](https://larvitar.dvisionlab.com/examples/masks.html)

---

### 9. Custom Digital Subtraction Algorithm

This example demonstrates how to implement a custom digital subtraction algorithm in Larvitar, commonly used in X-ray angiography to enhance vascular structures. Digital subtraction removes background information by subtracting a "mask" image from contrast-enhanced images, making it easier to visualize blood vessels or other targeted structures. This example is ideal for users aiming to apply custom image processing techniques within their workflows.

Key features covered in this example include:
- Loading and aligning mask and contrast-enhanced images
- Applying a custom subtraction algorithm to remove background structures
- Fine-tuning subtraction parameters to enhance vascular visibility
- Exporting or saving processed images for further analysis

[View Example ➔](https://larvitar.dvisionlab.com/examples/dsa.html)

---

### 10. Watershed Segmentation Tool

This example demonstrates the use of the **Watershed Segmentation Tool** in Larvitar. The watershed algorithm is a powerful method for segmenting overlapping or touching regions, particularly useful in medical imaging where structures such as organs or lesions need to be separated precisely. This example shows how to apply the watershed tool to achieve refined, boundary-aware segmentation.

Key features covered in this example include:
- Initializing and applying the watershed segmentation tool on medical images
- Defining markers or regions of interest to guide the segmentation process
- Adjusting watershed parameters to achieve accurate and smooth boundaries
- Integrating the watershed results with other segmentation layers for comprehensive analysis

[View Example ➔](https://larvitar.dvisionlab.com/examples/watershedSegmentationTool.html)

---

### 11. Adding an External Custom Tool

This example demonstrates how to integrate an external custom tool into Larvitar, allowing users to extend the platform's functionality with specialized tools tailored to specific imaging needs. By following this guide, you’ll learn how to create, configure, and activate custom tools seamlessly within the Larvitar environment.

Key features covered in this example include:
- Setting up an external custom tool and integrating it with Larvitar
- Configuring tool properties and interactions to fit specific use cases
- Registering the custom tool within the Larvitar framework for easy access
- Activating and testing the custom tool alongside existing Cornerstone tools

[View Example ➔](https://larvitar.dvisionlab.com/examples/external.html)

---

### 12. Applying Color Maps

This example demonstrates how to use color maps in Larvitar to enhance the visualization of medical images. Color maps allow users to apply various color schemes to grayscale images, highlighting specific structures and improving contrast for better interpretation. This example is ideal for users aiming to bring out details or emphasize particular regions within an image.

Key features covered in this example include:
- Loading and applying different color maps to medical images
- Adjusting color map settings to customize contrast and visualization
- Exploring predefined color maps (e.g., hot, cool, rainbow) for specific imaging needs
- Implementing custom color maps for tailored visualization in unique workflows

[View Example ➔](https://larvitar.dvisionlab.com/examples/colorMaps.html)

---

### 13. Using Layers for Image Visualization

This example demonstrates how to use layers in Larvitar to visualize multiple images or annotations on top of one another. Layering enables users to combine different imaging data, such as anatomical and functional scans, or to overlay annotations and segmentation masks on the primary image. This layered approach is valuable for comprehensive analysis and comparison within a single viewer.

Key features covered in this example include:
- Creating and managing multiple layers in a single viewer
- Overlaying annotations, segmentation masks, and additional images
- Adjusting opacity, blending, and ordering of layers for clear visualization
- Synchronizing layers for multi-modal analysis and detailed comparisons
  
[View Example ➔](https://larvitar.dvisionlab.com/examples/layers.html)

---

### 14. Reslice Axial, Sagittal, and Coronal Views

This example demonstrates how to use Larvitar’s reslice functionality to view medical images along the three main anatomical planes: axial, sagittal, and coronal. This reslice feature provides users with the flexibility to interactively re-orient and view slices from different angles, enabling a detailed examination of structures across multiple perspectives.

Key features covered in this example include:
- Setting up reslice views for the axial, sagittal, and coronal planes
- Adjusting plane orientation and position dynamically
- Enhancing visualization for comprehensive image analysis across key anatomical planes

[View Example ➔](https://larvitar.dvisionlab.com/examples/reslice.html)

---

### 15. Loading and Visualizing NRRD Image Format

This example demonstrates how to load and visualize images in the **NRRD (Nearly Raw Raster Data)** format using Larvitar. NRRD is commonly used in medical imaging for volumetric data and supports efficient storage of complex anatomical structures. This example covers the steps required to load NRRD files and display them in a 3D viewer, making it easy to work with high-resolution datasets.

Key features covered in this example include:
- Loading NRRD files and parsing metadata
- Visualizing volumetric NRRD data in axial, sagittal, and coronal planes
- Exploring visualization adjustments to enhance clarity and detail in 3D images

[View Example ➔](https://larvitar.dvisionlab.com/examples/nrrd.html)

---

## More Examples

For a comple
