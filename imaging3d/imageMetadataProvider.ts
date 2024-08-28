const metadata: { [key: string]: any } = {};

function add(imageId: string, metadata: any) {
  //metadata["wadors:" + imageId] = metadata;
  metadata[imageId] = metadata;
}

function get(type: string, imageId: string) {
  if (type === "metadata") {
    //return metadata["wadors:" + imageId];
    return metadata[imageId];
  }
}

export const imageMetadataProvider = { add, get };
