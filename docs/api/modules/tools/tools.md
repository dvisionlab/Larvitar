<div align="center">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# CornerstoneTools

[CornerstoneTools](https://github.com/cornerstonejs/cornerstoneTools) is a powerful library designed for creating, managing, and utilizing interactive tools in medical imaging applications. Built on top of the Cornerstone framework, it provides a collection of tools for annotations, measurements, and more. Larvitar supports the integration of custom tools, allowing developers to extend its functionality to meet specific requirements.

## Key Features

### Annotation Tools

Annotation tools allow users to add information directly to images for reference or analysis. Examples include:

- **Length Tool:** Measures the distance between two points.
- **Angle Tool:** Calculates angles between intersecting lines.
- **Text Annotation Tool:** Adds descriptive labels or comments on specific areas of the image.

These tools are vital for medical professionals to document findings, mark regions of interest (ROIs), and collaborate effectively.

### Segmentation Tools

Segmentation tools help divide medical images into meaningful regions, such as organs or abnormalities. These tools are commonly used in diagnostics and surgical planning:

- **Brush Tool:** Allows users to paint areas of interest for segmentation.
- **Threshold Tool:** Automatically segments regions based on intensity values.
- **Freehand Tool:** Enables precise manual segmentation by drawing custom shapes.

By isolating specific areas, segmentation provides a clearer understanding of the image data.

### Interaction Tools

Interaction tools enhance the user's ability to navigate and manipulate medical images:

- **Zoom Tool:** Magnifies the image for a detailed view.
- **Pan Tool:** Moves the image within the viewport for better positioning.
- **Window Level Tool:** Adjusts the brightness and contrast of the image for better visualization of features.

These tools ensure users can efficiently explore the image and focus on specific details.

### Custom Tools

Larvitar allows developers to create custom tools tailored to their specific imaging workflows. These tools can be:

- Configured with custom behavior.
- Registered to handle specific user interactions.
- Integrated seamlessly with Cornerstone-enabled applications.

## How It Works

1. **Tool Registration:**  
   Tools are registered with `registerExternalTool` to make them available within the application. Developers can define their own tools or use the prebuilt ones provided by the library.

2. **Usage in Imaging:**  
   Tools operate directly on the imaging data rendered in the registered viewport.

3. **Tool Configuration:**  
   Tools are configured to handle user input events like mouse clicks, drags, and scrolls. Custom configurations allow fine-tuning the behavior for specific imaging requirements.

<br/><br/>

<div align="center">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
