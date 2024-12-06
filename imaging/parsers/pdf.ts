/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using PDFium
 */

// external libraries
import { PDFiumLibrary } from "@hyzyla/pdfium/browser/cdn";
// internal libraries
import { populateFileManager } from "../loaders/fileLoader";

/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export const generateFiles = async function (fileURL: string): Promise<File[]> {
  let files: File[] = [];
  const pdfFile = await fetch(fileURL).then(response => response.blob());

  // Read the PDF file as an array buffer
  const buff = await pdfFile.arrayBuffer();

  console.log(buff);
  // Initialize the library and load the document
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(buff);
  const pages = document.pages();

  // Cycle through pages and generate PNG files
  for (let i = 0; i < pages.length; i++) {
    let aFile: File | null = await generateFile(pages[i], i + 1);
    files.push(aFile);
  }

  // Clean up after processing
  document.destroy();
  library.destroy();

  return files; // Return the generated files
};

// internal functions

/**
 * Generate a single PNG file for a PDF page
 * @instance
 * @function generateFile
 * @param {any} page - The PDF page object
 * @param {number} pageNumber - The page number to be converted
 * @returns {File} The png image of the pdf page in a File object
 */
async function generateFile(page: any, pageNumber: number): Promise<File> {
  // Render PDF page to PNG image using PDFium
  const image = await page.render({
    scale: 3,
    render: "sharp"
  });
  let blob: Blob | null = new Blob([image.data], {
    type: "image/png"
  });
  let file: File | null = new File([blob], `pdf_page_${pageNumber}.png`, {
    type: "image/png"
  });
  populateFileManager(file);
  blob = null;
  return file;
}
