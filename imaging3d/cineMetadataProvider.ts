import { metaData } from "@cornerstonejs/core";

// Mappa privata: imageId → cineModule data
const cineModuleMap = new Map<
  string,
  { frameTime: number; startTime?: number; frameRate?: number }
>();

// Provider function per Cornerstone
function cineModuleProvider(type: string, imageId: string) {
  if (type === "cineModule") {
    console.log("cineModuleProvider: tipo riconosciuto", type, imageId);
    return cineModuleMap.get(imageId);
  }
  return undefined;
}

// Registra il provider a runtime
export function registerCineModuleProvider() {
  metaData.addProvider(cineModuleProvider);
}

// Funzione per associare metadata cine a un imageId
export function addCineMetadata(
  imageId: string,
  options: {
    frameTime: number;
    startTime?: number;
    frameRate?: number;
  }
) {
  console.log("addCineMetadata:", imageId, options);
  cineModuleMap.set(imageId, options);
}
