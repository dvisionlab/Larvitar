declare module "cornerstone-math";
declare module "cornerstone-tools";
declare module "cornerstone-wado-image-loader";
declare module "cornerstone-web-image-loader";
declare module "cornerstone-file-image-loader";
declare module "dicom-character-set";
declare module "@hyzyla/pdfium/browser/cdn";
declare module "@hyzyla/pdfium/pdfium.wasm";

// cs3D
declare module "@cornerstonejs/dicom-image-loader";
declare module "@cornerstonejs/core/dist/esm/utilities";
declare module "dcmjs";

declare global {
  interface Document {
    documentMode?: any;
  }
}
