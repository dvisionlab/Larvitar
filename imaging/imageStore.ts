/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */

// external libraries
import { get as _get } from "lodash";
import { MetadataValue } from "./types";

type StoreSeries = { imageIds: string[]; progress: number };

type Store = {
  colormapId: string;
  errorLog: string; // TODO review this, should be an array?
  leftActiveTool?: string;
  rightActiveTool?: string;
  series: { [seriesUID: string]: StoreSeries };
  viewports: { [key: string]: typeof DEFAULT_VIEWPORT };
  // fallback for any other field
  [key: string]: any;
};

type SetPayload =
  | [string, string]
  | ["progress", string, number]
  | [
      "isColor" | "isMultiframe" | "isPDF" | "isTimeserie" | "ready",
      string,
      boolean
    ]
  | [
      (
        | "loading"
        | "minPixelValue"
        | "maxPixelValue"
        | "minSliceId"
        | "maxSliceId"
        | "minTimeId"
        | "maxTimeId"
        | "sliceId"
        | "timeId"
        | "timestamp"
      ),
      string,
      number
    ]
  | ["timestamps" | "timeIds", string, number[]]
  | ["contrast", string, number, number]
  | ["translation", string, { x: number; y: number }]
  | ["defaultViewport", string, number, number, number, number, number, number];

// Larvitar store object
let STORE: Store;

// Data listeners
let storeListener: ((data: Store) => {}) | undefined = undefined;
const seriesListeners = {} as {
  [seriesId: string]: (data: StoreSeries) => {};
};
const viewportsListeners = {} as {
  [elementId: string]: (data: typeof DEFAULT_VIEWPORT) => {};
};

// default initial store object
const INITIAL_STORE_DATA: Store = {
  colormapId: "gray",
  errorLog: "",
  leftActiveTool: undefined,
  rightActiveTool: undefined,
  series: {},
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

// Trigger store listeners
const triggerStoreListener = (data: Store) =>
  storeListener ? storeListener(data) : undefined;

const triggerViewportListener = (elementId: string) => {
  if (viewportsListeners[elementId] && STORE?.viewports[elementId]) {
    viewportsListeners[elementId](STORE.viewports[elementId]);
  }
};

const triggerSeriesListener = (seriesId: string) => {
  if (seriesListeners[seriesId] && STORE?.series[seriesId]) {
    seriesListeners[seriesId](STORE.series[seriesId]);
  }
};

/**
 * Set a value into store
 * @function setValue
 * @param {Object} data - The data object
 */
const setValue = (store: Store, data: SetPayload) => {
  let field = data[0];
  const k = data[1];
  let [_1, _2, ...v] = data;

  const viewport = store.viewports[k];

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
      store.series[k][field] = (v as [number])[0];
      triggerSeriesListener(k);
      break;

    case "isColor":
    case "isMultiframe":
    case "isPDF":
    case "isTimeserie":
    case "ready":
      viewport[field] = (v as [boolean])[0];
      triggerViewportListener(k);
      break;

    case "loading":
    case "minPixelValue":
    case "maxPixelValue":
    case "minSliceId":
    case "maxSliceId":
    case "minTimeId":
    case "maxTimeId":
    case "sliceId":
    case "timeId":
    case "timestamp":
      viewport[field] = (v as [number])[0];
      triggerViewportListener(k);
      break;

    case "timestamps":
    case "timeIds":
      viewport[field] = (v as [[number]])[0];
      triggerViewportListener(k);
      break;

    case "rotation":
    case "scale":
    case "thickness":
      viewport.viewport[field] = (v as [number])[0];
      triggerViewportListener(k);
      break;

    case "translation":
      viewport.viewport[field] = (v as [{ x: number; y: number }])[0];
      triggerViewportListener(k);
      break;

    case "contrast":
      v = v as [number, number];
      viewport.viewport.voi.windowWidth = v[0];
      viewport.viewport.voi.windowCenter = v[1];
      triggerViewportListener(k);
      break;

    case "dimensions":
      v = v as [number, number];
      viewport.viewport.rows = v[0];
      viewport.viewport.cols = v[1];
      triggerViewportListener(k);
      break;

    case "spacing":
      v = v as [number, number];
      viewport.viewport.spacing_x = v[0];
      viewport.viewport.spacing_y = v[1];
      triggerViewportListener(k);
      break;

    case "defaultViewport":
      v = v as [number, number, number, number, number, number];
      viewport.default.scale = v[0];
      viewport.default.rotation = v[1];
      viewport.default.translation.x = v[2];
      viewport.default.translation.y = v[3];
      viewport.default.voi.windowWidth = v[4];
      viewport.default.voi.windowCenter = v[5];
      triggerViewportListener(k);
      break;

    default:
      store[field] = k;
      break;
  }
};

/**
 * Instancing the store
 */
const setup = (data = { ...INITIAL_STORE_DATA }) => {
  /**
   * Create the Proxy handler object
   * @param  {String} name The namespace
   * @param  {Object} data The data object
   * @return {Object}      The Proxy handler
   */
  const handler: ProxyHandler<Store> = {
    get: (obj, prop: string) => {
      if (prop === "_isProxy") return true;
      if (
        ["object", "array"].includes(
          Object.prototype.toString.call(obj[prop]).slice(8, -1).toLowerCase()
        ) &&
        !obj[prop]._isProxy
      ) {
        obj[prop] = new Proxy<Store>(obj[prop], handler);
      }
      return obj[prop];
    },
    set: (obj, prop: string, value) => {
      // console.warn("SET", obj, prop, value);
      if (obj[prop] === value) return true;
      obj[prop] = value;
      triggerStoreListener(data);
      return true;
    },
    deleteProperty: (obj, prop: string) => {
      delete obj[prop];
      triggerStoreListener(data);
      return true;
    }
  };

  return new Proxy<Store>(data, handler);
};

const initializeStore = () => {
  STORE = setup();
};

const validateStore = () => {
  if (!STORE) {
    throw "Larvitar store does not exists. Initialize it with the 'initializeStore' function.";
  }
};

export const set = (
  field: string,
  payload: string | Array<MetadataValue> // TODO-ts use SetPayload type here
) => {
  validateStore();
  payload = Array.isArray(payload) ? payload : [payload];
  setValue(STORE!, [field, ...payload] as SetPayload);
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
  addSeriesId: (seriesId: string, imageIds: string[]) => {
    validateStore();
    if (!STORE!.series[seriesId]) {
      STORE!.series[seriesId] = {} as StoreSeries;
    }
    STORE!.series[seriesId].imageIds = imageIds;
    triggerSeriesListener(seriesId);
  },
  removeSeriesId: (seriesId: string) => {
    validateStore();
    delete STORE!.series[seriesId];
  },
  resetSeriesIds: () => {
    validateStore();
    STORE!.series = {};
  },
  // expose useful sets
  setSliceId: (elementId: string, imageIndex: number) => {
    set("sliceId", [elementId, imageIndex]);
  },
  setMaxSliceId: (elementId: string, imageIndex: number) => {
    set("maxSliceId", [elementId, imageIndex]);
  },
  // get
  get: (props: string | string[]) => {
    validateStore();
    return _get(STORE, props);
  },
  // watch store
  addStoreListener: (listener: (data: Store) => {}) =>
    (storeListener = listener),
  removeStoreListener: () => (storeListener = undefined),
  // watch single viewport
  addViewportListener: (
    elementId: string,
    listener: (data: typeof DEFAULT_VIEWPORT) => {}
  ) => {
    viewportsListeners[elementId] = listener;
  },
  removeViewportListener: (elementId: string) => {
    delete viewportsListeners[elementId];
  },
  // watch single series
  addSeriesListener: (
    seriesId: string,
    listener: (data: StoreSeries) => {}
  ) => {
    seriesListeners[seriesId] = listener;
  },
  removeSeriesListener: (seriesId: string) => {
    delete seriesListeners[seriesId];
  }
};