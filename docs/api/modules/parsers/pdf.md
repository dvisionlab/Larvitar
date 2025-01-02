<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# PDF Parser Module

The `pdf` module is designed to handle **DICOM encapsulated PDF objects**, allowing you to extract and render individual PDF pages as image files. It leverages the [PDFium library](https://github.com/hyzyla/pdfium) for PDF rendering, providing high-quality output for medical imaging and documentation workflows.

## Features

- **PDF to Image Conversion**: Extracts and renders PDF pages as PNG images.
- **Memory Optimization**: Ensures efficient memory management by releasing unused resources.
- **File Management Integration**: Automatically integrates generated files with the internal [File Manager](../managers/fileManager.md).
- **Error Handling**: Validates file types and handles common fetch/rendering errors.

## API Reference

`generateFiles`
Generates an array of image files from a PDF file.

#### **Syntax**

```typescript
async generateFiles(fileURL: string): Promise<File[]>
```

#### **Parameters**

| Parameter    |	Type	 | Description                               |
|--------------|-------------|-------------------------------------------|
| `fileURL`    |	string	 | The URL of the PDF file to be processed.  |   


#### **Returns**

An array of `File` objects representing the PNG images of each PDF page.

#### **Example**

```typescript
const pdfFileURL = "https://example.com/sample.pdf";
const files = await generateFiles(pdfFileURL);

console.log("Generated Files:", files);
// Outputs: Array of PNG file objects
```

## How It Works

### Core Workflow

1. **Fetching the PDF**: The `generateFiles` function fetches the PDF from the provided URL.
2. **Parsing Pages**: The PDFium library parses the PDF, extracts individual pages, and renders them as bitmap data.
3. **Canvas Rendering**: The internal `generateFile` function converts bitmap data into a PNG using the HTML5 Canvas API.
4. **File Creation**: Each page is saved as a `File` object and added to the [File Manager](../managers/fileManager.md).

### Error Handling

- **Fetch Errors**: Handles network or file retrieval errors.
- **Invalid File Type**: Ensures only valid PDFs are processed.
- **Rendering Failures**: Detects and handles errors during bitmap conversion.

### Limitations

- **PDFium Dependency**: Requires the PDFium library for rendering, which may not support all PDF features.
- **Memory Usage**: Large PDF files with numerous pages may require significant memory during processing.
- **Rendering Scale**: Currently set to `3x` scale; adjustments may be needed for specific use cases.
  
<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>