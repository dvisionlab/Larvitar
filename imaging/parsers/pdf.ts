/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using pdfjs-dist library
 */

// external libraries
import {
  getDocument,
  GlobalWorkerOptions,
  PDFPageProxy,
  PageViewport
} from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = require("pdfjs-dist/build/pdf.worker");

// internal libraries
import { pdfType } from "../types";

/**
 * This module provides the following functions to be exported:
 * convertToPNG(pdf, pageNumber)
 * generateFiles(fileURL)
 */

/**
 * Convert a pdf page to a png image in base64 format
 * @instance
 * @function convertToPNG
 * @param {pdfType} pdf - The pdf object
 * @param {number} pageNumber - The page number to be converted
 * @returns {string} The png image in base64 format
 */
export const convertToPNG = async function (
  pdf: pdfType,
  pageNumber: number
): Promise<string> {
  const page: PDFPageProxy = await pdf.getPage(pageNumber);
  const viewport: PageViewport = page.getViewport({ scale: 1.5 });
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Failed to get 2D context from canvas");
  }

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  await page.render(renderContext).promise;
  return canvas.toDataURL("image/png");
};

/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export const generateFiles = async function (fileURL: string): Promise<File[]> {
  let files: File[] = [];
  await getDocument(fileURL).promise.then(async (pdf: pdfType) => {
    // cycle through pages
    for (let i = 0; i < pdf.numPages; i++) {
      let aFile: File | null = await generateFile(pdf, i + 1);
      files[i] = aFile;
      aFile = null;
    }
  });
  return files; // Add this line to return the files array
};

// internal functions

/**
 *
 * @instance
 * @function generateFile
 * @param {pdfType} pdf - The pdf object
 * @param {number} pageNumber - The page number to be converted
 * @returns {File} The png image of the pdf page in a File object
 */
async function generateFile(pdf: pdfType, pageNumber: number): Promise<File> {
  const pngDataURL: string = await convertToPNG(pdf, pageNumber);
  let byteString: string | null = atob(pngDataURL.split(",")[1]);
  let ab: ArrayBuffer | null = new ArrayBuffer(byteString.length);
  let ia: Uint8Array | null = new Uint8Array(ab);
  for (let j = 0; j < byteString.length; j++) {
    ia[j] = byteString.charCodeAt(j);
  }
  let blob: Blob | null = new Blob([ab], {
    type: "image/png"
  });
  let file: File | null = new File([blob], `pdf_page_${pageNumber}.png`, {
    type: "image/png"
  });
  byteString = null;
  ab = null;
  ia = null;
  blob = null;
  return file;
}
