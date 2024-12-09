/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using PDFium
 */

// external libraries
import { PDFiumLibrary } from "@hyzyla/pdfium/browser/cdn";
// internal libraries
import { populateFileManager } from "../loaders/fileLoader";

import wasmUrl from "@hyzyla/pdfium/pdfium.wasm";
/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export const generateFiles = async function (fileURL: string): Promise<File[]> {
  let files: File[] = [];
  const response = await fetch(fileURL);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF file: ${response.statusText}`);
  }
  const pdfFile = await response.blob();

  if (pdfFile.type !== "application/pdf") {
    throw new Error("Invalid MIME type, expected application/pdf");
  }

  const buff = await pdfFile.arrayBuffer();
  console.log("PDF Byte Array:", new Uint8Array(buff.slice(0, 8))); // Inspect initial bytes
  console.log(wasmUrl);
  // Initialize the library and load the document
  const library = await PDFiumLibrary.init({
    wasmUrl: wasmUrl
  });
  /* const library = await PDFiumLibrary.init({
    wasmBinaryPath: "/pdfium/pdfium.wasm", // Adjust the path based on your project structure
    disableCDNWarning: true
  });*/
  const usableBuffer = new Uint8Array(buff);
  const document = await library.loadDocument(usableBuffer);
  const pages = await document.pages();
  console.log("pages", pages);

  for (const page of document.pages()) {
    let aFile = await generateFile(page);
    files.push(aFile);
  }

  document.destroy();
  library.destroy();
  console.log(files);

  // Trigger download of generated files
  for (const file of files) {
    //downloadFile(file);
  }

  return files;
};

// Helper function to download files
function downloadFile(file: File): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(file);
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// internal functions

/**
 * Generate a single PNG file for a PDF page
 * @instance
 * @function generateFile
 * @param {any} page - The PDF page object
 * @param {number} pageNumber - The page number to be converted
 * @returns {File} The png image of the pdf page in a File object
 */
async function generateFile(page: any): Promise<File> {
  console.log(`${page.number} - rendering...`);
  // Render PDF page to PNG image using PDFium
  const image = await page.render({
    scale: 3,
    render: "bitmap"
  });
  let blob: Blob | null = new Blob([image.data], {
    type: "image/png"
  });
  let file: File | null = new File([blob], `pdf_page_${page.number}.png`, {
    type: "image/png"
  });
  populateFileManager(file);
  blob = null;
  return file;
}
