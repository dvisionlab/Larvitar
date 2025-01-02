declare module "cornerstone-math";
declare module "cornerstone-tools";
declare module "cornerstone-wado-image-loader";
declare module "cornerstone-web-image-loader";
declare module "cornerstone-file-image-loader";
declare module "dicom-character-set";
declare module "@hyzyla/pdfium/browser/cdn";
declare module "@hyzyla/pdfium/pdfium.wasm";

declare global {
  interface Document {
    documentMode?: any;
  }
}
