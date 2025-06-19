import { metaData } from "@cornerstonejs/core";

// Mappa privata: imageId → imageUrlModule
const imageUrlModuleMap = new Map<string, { rendered: string }>();

// Provider function per Cornerstone
function imageUrlModuleProvider(type: string, imageId: string) {
  if (type === "imageUrlModule") {
    console.log("imageUrlModuleProvider: type riconosciuto", type, imageId);
    console.log(imageUrlModuleMap.get(imageId));
    return imageUrlModuleMap.get(imageId);
  }
  console.log("imageUrlModuleProvider: type non riconosciuto", type);
  return undefined;
}

// Registra il provider a runtime
export function registerImageUrlModuleProvider() {
  metaData.addProvider(imageUrlModuleProvider);
}

// Funzione per associare video a un imageId
export function addImageUrlMetadata(imageId: string, videoUrl: string) {
  console.log(
    "addImageUrlMetadata: associando video a imageId",
    imageId,
    videoUrl
  );
  imageUrlModuleMap.set(imageId, { rendered: videoUrl });
}
