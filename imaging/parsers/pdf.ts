/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using PDFium
 */

// external libraries
import { PDFiumLibrary } from "@hyzyla/pdfium/browser/cdn";

// internal libraries
import { populateFileManager } from "../imageManagers";

/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export const generateFiles = async function (fileURL: string): Promise<File[]> {
  let files: File[] = [];
  const response: Response = await fetch(fileURL);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF file: ${response.statusText}`);
  }

  let pdfFile: Blob = await response.blob();

  if (pdfFile.type !== "application/pdf") {
    throw new Error("Invalid MIME type, expected application/pdf");
  }

  let buff: ArrayBuffer = await pdfFile.arrayBuffer();

  // Initialize the library and load the document
  const library = await PDFiumLibrary.init({
    disableCDNWarning: true
  });

  let usableBuffer: Uint8Array = new Uint8Array(buff);
  const pdfdocument = await library.loadDocument(usableBuffer);
  const pages = await pdfdocument.pages();

  for (const page of pages) {
    const aFile = await generateFile(page);
    files.push(aFile);
  }

  pdfdocument.destroy();
  library.destroy();

  // free up memory
  // @ts-ignore
  pdfFile = null;
  // @ts-ignore
  buff = null;
  // @ts-ignore
  usableBuffer = null;

  return files;
};

// internal functions

/**
 * Generate a single PNG file for a PDF page
 * @instance
 * @function generateFile
 * @param {any} page - The PDF page object
 * @returns {File} The PNG image of the PDF page as a File object
 */
async function generateFile(page: any): Promise<File> {
  // Render PDF page to bitmap data using PDFium
  let image = await page.render({
    scale: 3, // TODO: adjust scale
    render: "bitmap"
  });

  // Create a canvas element to convert the bitmap to PNG
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas");
  }

  // Create an ImageData object from the bitmap data
  // Use the bitmap data from PDFium directly
  let clampedArray = new Uint8ClampedArray(image.data);
  let imageData = new ImageData(clampedArray, image.width, image.height);

  // Draw the image data onto the canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert the canvas content to a Blob (PNG format)
  let blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(blob => resolve(blob), "image/png")
  );

  if (!blob) {
    throw new Error("Failed to create PNG blob from canvas");
  }

  // Optionally create a File object
  const file = new File([blob], `pdf_page_${page.number}.png`, {
    type: "image/png"
  });

  // Populate the file manager with the file
  populateFileManager(file);

  // free up memory
  // @ts-ignore
  image = null;
  // @ts-ignore
  clampedArray = null;
  // @ts-ignore
  imageData = null;
  // @ts-ignore
  blob = null;

  return file;
}

// Helper function to download files
function downloadFile(file: File | Blob): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(file);
  link.href = url;
  //@ts-ignore
  link.download = file.name ?? "downloadPdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
