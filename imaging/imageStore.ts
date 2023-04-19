/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */

// external libraries
import { get as _get } from "lodash";
import { Series, Viewport } from "./types";

type Store = {
  colormapId: string;
  errorLog: any;
  leftActiveTool: string;
  rightActiveTool: string;
  series: { [seriesUID: string]: { imageIds: string[]; progress: number } };
  viewports: { [key: string]: typeof DEFAULT_VIEWPORT };
  // fallback for any other field
  [key: string]: any;
};

// Larvitar store object
let STORE: Store | undefined = undefined; // TODO: fix this when store is typed

// default initial store object
const INITIAL_STORE_DATA = {
  colormapId: "gray",
  errorLog: null,
  leftActiveTool: "Wwwc",
  rightActiveTool: "Zoom",
  series: {}, // seriesUID: {imageIds:[], progress:value}
  viewports: {}
};

// default viewport object
const DEFAULT_VIEWPORT: {
  loading: number;
  ready: boolean;
  minSliceId: number;
  maxSliceId: number;
  sliceId: number;
  minTimeId: number;
  maxTimeId: number;
  timeId: number;
  timestamp: number;
  timestamps: number[];
  timeIds: number[];
  rows: number;
  cols: number;
  spacing_x: number;
  spacing_y: number;
  thickness: number;
  minPixelValue: number;
  maxPixelValue: number;
  isColor: boolean;
  isMultiframe: boolean;
  isTimeserie: boolean;
  isPDF: boolean;
  viewport: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowCenter: number;
      windowWidth: number;
    };
    // redundant fields ?
    rows: number;
    cols: number;
    spacing_x: number;
    spacing_y: number;
    thickness: number;
  };
  default: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowCenter: number;
      windowWidth: number;
    };
  };
} = {
  loading: 0, // from 0 to 100 (%)
  ready: false, // true when currentImageId is rendered
  minSliceId: 0,
  maxSliceId: 0,
  sliceId: 0,
  minTimeId: 0,
  maxTimeId: 0,
  timeId: 0,
  timestamp: 0,
  timestamps: [],
  timeIds: [],
  rows: 0,
  cols: 0,
  spacing_x: 0.0,
  spacing_y: 0.0,
  thickness: 0.0,
  minPixelValue: 0,
  maxPixelValue: 0,
  isColor: false,
  isMultiframe: false,
  isTimeserie: false,
  isPDF: false,
  viewport: {
    scale: 0.0,
    rotation: 0.0,
    translation: {
      x: 0.0,
      y: 0.0
    },
    voi: {
      windowCenter: 0.0,
      windowWidth: 0.0
    },
    // redundant fields ?
    rows: 0,
    cols: 0,
    spacing_x: 0.0,
    spacing_y: 0.0,
    thickness: 0.0
  },
  default: {
    scale: 0.0,
    rotation: 0.0,
    translation: {
      x: 0.0,
      y: 0.0
    },
    voi: {
      windowCenter: 0.0,
      windowWidth: 0.0
    }
  }
};

/**
 * Set a value into store
 * @function setValue
 * @param {field} field - The name of the field to be updated
 * @param {Object} data - The data object
 */
const setValue = (store: Store, field: string, data: Object) => {
  let k, v;

  if (Array.isArray(data)) {
    [k, ...v] = data;
  } else {
    v = [data];
  }

  let viewport = store.viewports[k];

  // rename field
  switch (field) {
    case "renderingStatus":
      field = "ready";
      break;

    case "loadingProgress":
      field = "loading";
      break;

    default:
      break;
  }

  // assign values
  switch (field) {
    case "progress":
      store.series[k][field] = v[0];
      break;

    case "isColor":
    case "isMultiframe":
    case "isPDF":
    case "isTimeserie":
    case "loading":
    case "minPixelValue":
    case "maxPixelValue":
    case "minSliceId":
    case "maxSliceId":
    case "minTimeId":
    case "maxTimeId":
    case "ready":
    case "sliceId":
    case "timeId":
    case "timestamp":
    case "timestamps":
    case "timeIds":
      // @ts-ignore TODO fix this
      viewport[field] = v[0];
      break;

    case "rotation":
    case "scale":
    case "translation":
    case "thickness":
      viewport.viewport[field] = v[0];
      break;

    case "contrast":
      viewport.viewport.voi.windowWidth = v[0];
      viewport.viewport.voi.windowCenter = v[0];
      break;

    case "dimensions":
      viewport.viewport.rows = v[0];
      viewport.viewport.cols = v[1];
      break;

    case "spacing":
      viewport.viewport.spacing_x = v[0];
      viewport.viewport.spacing_y = v[1];
      break;

    case "defaultViewport":
      viewport.default.scale = v[0];
      viewport.default.rotation = v[1];
      viewport.default.translation.x = v[2];
      viewport.default.translation.y = v[3];
      viewport.default.voi.windowWidth = v[4];
      viewport.default.voi.windowCenter = v[5];
      break;

    default:
      if (k) {
        store[field][k] = v[0];
      } else {
        store[field] = v[0];
      }
      break;
  }
};

/**
 * Instancing the store
 */
const setup = (name = "store", data = { ...INITIAL_STORE_DATA }) => {
  /**
   * Emit a custom event
   * @param  {String} type   The event type
   * @param  {*}      detail Any details to pass along with the event
   */
  const emit = (type: string, detail: unknown) => {
    // Create a new event
    const event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail
    });

    // Dispatch the event
    return document.dispatchEvent(event);
  };

  /**
   * Create the Proxy handler object
   * @param  {String} name The namespace
   * @param  {Object} data The data object
   * @return {Object}      The Proxy handler
   */
  // TODO-ts fix this
  const handler = (name: string, data: any) => {
    return {
      get: (obj: any, prop: any) => {
        if (prop === "_isProxy") return true;
        if (
          ["object", "array"].includes(
            Object.prototype.toString.call(obj[prop]).slice(8, -1).toLowerCase()
          ) &&
          !obj[prop]._isProxy
        ) {
          obj[prop] = new Proxy(obj[prop], handler(name, data));
        }
        return obj[prop];
      },
      set: (obj: any, prop: any, value: any) => {
        // console.warn("SET", obj, prop, value);
        if (obj[prop] === value) return true;
        obj[prop] = value;
        emit(name, data); // TODO multiple emits
        return true;
      },
      deleteProperty: (obj: any, prop: any) => {
        delete obj[prop];
        emit(name, data);
        return true;
      }
    };
  };

  return new Proxy(data, handler(name, data));
};

const initializeStore = (name: string) => {
  STORE = setup(name);
};

const validateStore = () => {
  if (!STORE) {
    throw "Larvitar store does not exists. Initialize it with the 'initializeStore' function.";
  }
};

export const set = (field: string, payload: any) => {
  validateStore();
  setValue(STORE!, field, payload);
};

export default {
  initialize: initializeStore,
  // add/remove viewports
  addViewport: (name: string) => {
    validateStore();
    STORE!.viewports[name] = DEFAULT_VIEWPORT;
  },
  deleteViewport: (name: string) => {
    validateStore();
    delete STORE!.viewports[name];
  },
  // add/remove series instances ids
  addSeriesIds: (seriesId: string, imageIds: string[]) => {
    validateStore();
    if (!STORE!.series[seriesId]) {
      STORE!.series[seriesId] = {} as { imageIds: string[]; progress: number };
    }
    STORE!.series[seriesId].imageIds = imageIds;
  },
  removeSeriesIds: (seriesId: string) => {
    validateStore();
    delete STORE!.series[seriesId];
  },
  // get and watch values
  get: (props: string) => {
    validateStore();
    return _get(STORE, props);
  },
  // TODO multiple watchs
  watch: (cb: Function, name = "store") => {
    validateStore();
    // @ts-ignore: Property 'detail' does not exist on type 'Event'
    document.addEventListener(name, (event: Event) => cb(event.detail));
  }
};
