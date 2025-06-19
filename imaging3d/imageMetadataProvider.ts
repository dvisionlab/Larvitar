const metadata: { [key: string]: any } = {};

function add(imageId: string, metadata: any) {
  console.log(`Adding metadata for imageId: ${imageId}`);
  console.log(metadata);
  metadata[imageId] = metadata;
}

function get(type: string, imageId: string) {
  if (type === "metadata") {
    return metadata[imageId];
  }
}

export const imageMetadataProvider = { add, get };
