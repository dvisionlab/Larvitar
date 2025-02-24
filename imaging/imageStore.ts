/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */

// external libraries
import { get as _get, cloneDeep as _cloneDeep } from "lodash";
import type { StoreViewport } from "./types.d";

type StoreSeries = {
  imageIds: string[];
  progress: number;
  elementId: string;
  cached: { [imageId: string]: boolean };
};

type Store = {
  colormapId: string;
  errorLog: string;
  leftActiveTool?: string;
  rightActiveTool?: string;
  series: { [seriesUID: string]: StoreSeries };
  viewports: { [key: string]: StoreViewport };
  // fallback for any other field
  [key: string]: any;
};

type SetPayload =
  | ["errorLog" | "leftActiveTool" | "rightActiveTool", string]
  | [
      (
        | "isColor"
        | "isMultiframe"
        | "isPDF"
        | "waveform"
        | "dsa"
        | "isTimeserie"
        | "isDSAEnabled"
        | "ready"
      ),
      string,
      boolean
    ]
  | [
      (
        | "progress"
        | "loading"
        | "minPixelValue"
        | "maxPixelValue"
        | "minSliceId"
        | "maxSliceId"
        | "minTimeId"
        | "maxTimeId"
        | "rotation"
        | "scale"
        | "sliceId"
        | "timeId"
        | "thickness"
        | "numberOfFrames"
        | "numberOfTemporalPositions"
      ),
      string,
      number
    ]
  | ["cached", string, string, boolean]
  | ["timestamp", string, number | undefined]
  | ["seriesUID" | "modality", string, string | undefined]
  | ["pendingSliceId", string, number | undefined]
  | ["timestamps" | "timeIds" | "pixelShift", string, number[]]
  | [
      "contrast" | "dimensions" | "spacing" | "translation",
      string,
      number,
      number
    ]
  | [
      "defaultViewport",
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      boolean
    ];

// Larvitar store object
let STORE: Store;

// Data listeners
let storeListener: ((data: Store) => {}) | undefined = undefined;
const seriesListeners = {} as {
  [seriesId: string]: (data: StoreSeries) => {};
};
const viewportsListeners = {} as {
  [elementId: string]: (data: StoreViewport) => {};
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
const DEFAULT_VIEWPORT: StoreViewport = {
  loading: null, // from 0 to 100 (%)
  ready: false, // true when currentImageId is rendered
  minSliceId: 0,
  maxSliceId: 0,
  sliceId: 0,
  pendingSliceId: undefined,
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
  modality: "",
  isTimeserie: false,
  isDSAEnabled: false,
  isPDF: false,
  waveform: false,
  dsa: false,
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
      windowWidth: 0.0,
      invert: false
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

  // assign values
  switch (field) {
    case "progress":
      if (!store.series[k]) {
        return;
      }
      store.series[k][field] = (v as [number])[0];
      triggerSeriesListener(k);
      break;

    case "cached":
      if (!store.series[k]) {
        return;
      }
      v = v as [string, boolean];
      store.series[k][field][v[0]] = v[1];
      triggerSeriesListener(k);
      break;

    case "seriesUID":
      if (!viewport) {
        return;
      }
      viewport[field] = (v as [string])[0];
      triggerViewportListener(k);
      break;
    case "modality":
      if (!viewport) {
        return;
      }
      viewport[field] = (v as [string])[0];
      triggerViewportListener(k);
      break;
    case "isColor":
    case "isMultiframe":
    case "isPDF":
    case "waveform":
    case "dsa":
    case "isTimeserie":
    case "isDSAEnabled":
    case "ready":
      if (!viewport) {
        return;
      }
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
    case "pendingSliceId":
    case "timeId":
    case "timestamp":
    case "numberOfFrames":
    case "numberOfTemporalPositions":
      if (!viewport) {
        return;
      }
      viewport[field] = (v as [number])[0];
      triggerViewportListener(k);
      break;

    case "timestamps":
    case "timeIds":
    case "pixelShift":
      if (!viewport) {
        return;
      }
      viewport[field] = (v as [[number]])[0];
      triggerViewportListener(k);
      break;

    case "rotation":
    case "scale":
      if (!viewport) {
        return;
      }
      viewport.viewport[field] = (v as [number])[0];
      triggerViewportListener(k);
      break;

    case "thickness":
      if (!viewport) {
        return;
      }
      viewport[field] = (v as [number])[0];
      viewport.viewport[field] = (v as [number])[0];
      triggerViewportListener(k);
      break;

    case "translation":
      if (!viewport) {
        return;
      }
      v = v as [number, number];
      viewport.viewport[field] = { x: v[0], y: v[1] };
      triggerViewportListener(k);
      break;

    case "contrast":
      if (!viewport) {
        return;
      }
      v = v as [number, number];
      viewport.viewport.voi.windowWidth = v[0];
      viewport.viewport.voi.windowCenter = v[1];
      triggerViewportListener(k);
      break;

    case "dimensions":
      if (!viewport) {
        return;
      }
      v = v as [number, number];
      viewport.rows = v[0];
      viewport.cols = v[1];
      viewport.viewport.rows = v[0];
      viewport.viewport.cols = v[1];
      triggerViewportListener(k);
      break;

    case "spacing":
      if (!viewport) {
        return;
      }
      v = v as [number, number];
      viewport.spacing_x = v[0];
      viewport.spacing_y = v[1];
      viewport.viewport.spacing_x = v[0];
      viewport.viewport.spacing_y = v[1];
      triggerViewportListener(k);
      break;

    case "defaultViewport":
      if (!viewport) {
        return;
      }
      v = v as [number, number, number, number, number, number, boolean];
      viewport.default.scale = v[0];
      viewport.default.rotation = v[1];
      viewport.default.translation.x = v[2];
      viewport.default.translation.y = v[3];
      viewport.default.voi.windowWidth = v[4];
      viewport.default.voi.windowCenter = v[5];
      viewport.default.voi.invert = v[6];
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
const setup = (data = _cloneDeep(INITIAL_STORE_DATA)) => {
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

export const set = (payload: SetPayload) => {
  validateStore();
  setValue(STORE!, payload);
};

export default {
  initialize: initializeStore,
  // add/remove viewports
  addViewport: (name: string) => {
    validateStore();
    STORE!.viewports[name] = _cloneDeep(DEFAULT_VIEWPORT);
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
    // for each imageId create a cached[imageId] = false
    STORE!.series[seriesId].cached = {};
    imageIds.forEach(imageId => {
      STORE!.series[seriesId].cached[imageId] = false;
    });
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
    set(["sliceId", elementId, imageIndex]);
  },
  setPendingSliceId: (elementId: string, imageIndex: number) => {
    set(["pendingSliceId", elementId, imageIndex]);
  },
  setMaxSliceId: (elementId: string, imageIndex: number) => {
    set(["maxSliceId", elementId, imageIndex]);
  },
  setTimeId: (elementId: string, timeIndex: number) => {
    set(["timeId", elementId, timeIndex]);
  },
  setDSAEnabled: (elementId: string, enabled: boolean) => {
    set(["isDSAEnabled", elementId, enabled]);
  },
  setDSAPixelShift: (elementId: string, pixelShift: number[]) => {
    set(["pixelShift", elementId, pixelShift]);
  },
  resetActiveTools() {
    STORE!.leftActiveTool = undefined;
    STORE!.rightActiveTool = undefined;
  },
  // get
  get: (props: string | string[] | undefined) => {
    validateStore();
    return props ? _get(STORE, props) : STORE;
  },
  // watch store
  addStoreListener: (listener: (data: Store) => {}) =>
    (storeListener = listener),
  removeStoreListener: () => (storeListener = undefined),
  // watch single viewport
  addViewportListener: (
    elementId: string,
    listener: (data: StoreViewport) => {}
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
