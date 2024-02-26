import { registerTaskHandler } from "./WebWorker.js";

import { default as version } from "./version.js";

const cornerstoneWADOImageLoaderWebWorker = {
  registerTaskHandler,
  version
};

export { registerTaskHandler, version };

export default cornerstoneWADOImageLoaderWebWorker;
