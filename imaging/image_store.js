/** @module imaging/store
 *  @desc This file provides functionalities
 *        for data config store.
 */

// external libraries
import { get as _get } from "lodash";

// default viewport store object
const DEFAULT_VIEWPORT = {
  loading: 0, // from 0 to 100 (%)
  ready: false, // true when currentImageId is rendered
  minSliceId: 0,
  maxSliceId: 0,
  sliceId: 0,
  rows: 0,
  cols: 0,
  spacing_x: 0.0,
  spacing_y: 0.0,
  thickness: 0.0,
  minPixelValue: 0,
  maxPixelValue: 0,
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
    }
  },
  default: {
    scale: 0.0,
    rotation: 0.0,
    translation: {
      x: 0.0,
      y: 0.0
    },
    rotation: 0.0,
    voi: {
      windowCenter: 0.0,
      windowWidth: 0.0
    }
  }
};

/**
 * The Larvitar Internal Store
 */
export let larvitar_store = null;

/** Class representing the Larvitar Store. */
class Larvitar_Store {
  /**
   * Create the Larvitar Store
   * @param {Obj} vuex_store - The Vuex store
   * @param {String} vuex_module - The name of the vuex store module, can be null
   */
  constructor(vuex_store, vuex_module) {
    this.VUEX_STORE = vuex_store ? true : false;
    this.vuex_store = vuex_store;
    this.vuex_module = vuex_module;
    this.state = {
      manager: null,
      series: {}, // seriesUID: [imageIds]
      leftMouseHandler: "Wwwc",
      colormapId: "gray",
      viewports: {},
      errorLog: null,
      temp: {}
    };
  }

  /**
   * Enable the VUEX storage method
   * @function enableVuex
   * @param {String} vuex_module - The name of the vuex store module, can be null
   */
  enableVuex(vuex_module) {
    // VUEX IS ENABLED BY DEFAULT
    this.VUEX_STORE = true;
    this.vuex_module = vuex_module;
  }

  /**
   * Disable the VUEX storage method
   * @function disableVuex
   */
  disableVuex() {
    // VUEX IS ENABLED BY DEFAULT
    this.VUEX_STORE = false;
    this.vuex_module = null;
  }

  /**
   * Add a viewport into the store
   * @function addViewport
   * @param {String} viewportId - The viewport id
   */
  addViewport(viewportId) {
    if (this.VUEX_STORE) {
      let dispatch = "addViewport";
      let route = this.vuex_module
        ? this.vuex_module + "/" + dispatch
        : dispatch;
      this.vuex_store.dispatch(route, viewportId);
    } else {
      this.state.viewports[viewportId] = {};
      this.state.viewports[viewportId] = DEFAULT_VIEWPORT;
    }
  }

  /**
   * Delete a viewport from the store
   * @function deleteViewport
   * @param {String} viewportId - The viewport id
   */
  deleteViewport(viewportId) {
    if (this.VUEX_STORE) {
      let dispatch = "deleteViewport";
      let route = this.vuex_module
        ? this.vuex_module + "/" + dispatch
        : dispatch;
      this.vuex_store.dispatch(route, viewportId);
    } else {
      delete this.state.viewports[viewportId];
    }
  }

  /**
   * Add a serie into the store
   * @function addSeriesIds
   * @param {String} seriesId - The serie's id
   * @param {Array} imageIds - The array of image ids
   */
  addSeriesIds(seriesId, imageIds) {
    if (this.VUEX_STORE) {
      let dispatch = "addSeriesIds";
      let route = this.vuex_module
        ? this.vuex_module + "/" + dispatch
        : dispatch;
      this.vuex_store.dispatch(route, seriesId, imageIds);
    } else {
      this.state.series[seriesId] = imageIds;
    }
  }

  /**
   * Remove a serie from the store
   * @function removeSeriesIds
   * @param {String} seriesId - The serie's id
   */
  removeSeriesIds(seriesId) {
    if (this.VUEX_STORE) {
      let dispatch = "removeSeriesIds";
      let route = this.vuex_module
        ? this.vuex_module + "/" + dispatch
        : dispatch;
      this.vuex_store.dispatch(route, seriesId);
    } else {
      delete this.state.series[seriesId];
    }
  }

  /**
   * Set a value into store
   * @function set
   * @param {field} field - The name of the field to be updated
   * @param {Object} data - The data object
   */
  set(field, data) {
    if (this.VUEX_STORE) {
      let dispatch = "set" + field[0].toUpperCase() + field.slice(1);
      let route = this.vuex_module
        ? this.vuex_module + "/" + dispatch
        : dispatch;
      this.vuex_store.dispatch(route, data);
    } else {
      if (field == "scale" || field == "rotation" || field == "translation") {
        this.state["viewports"][data[0]]["viewport"][field] = data[1];
      } else if (field == "contrast") {
        this.state["viewports"][data[0]]["viewport"]["voi"]["windowWidth"] =
          data[1];
        this.state["viewports"][data[0]]["viewport"]["voi"]["windowCenter"] =
          data[2];
      } else if (field == "dimensions") {
        this.state["viewports"][data[0]]["rows"] = data[1];
        this.state["viewports"][data[0]]["cols"] = data[2];
      } else if (field == "spacing") {
        this.state["viewports"][data[0]]["spacing_x"] = data[1];
        this.state["viewports"][data[0]]["spacing_y"] = data[2];
      } else if (field == "thickness") {
        this.state["viewports"][data[0]]["thickness"] = data[1];
      } else if (field == "minPixelValue") {
        this.state["viewports"][data[0]]["minPixelValue"] = data[1];
      } else if (field == "maxPixelValue") {
        this.state["viewports"][data[0]]["maxPixelValue"] = data[1];
      } else if (field == "loadingStatus") {
        this.state["viewports"][data[0]]["ready"] = data[1];
      } else if (field == "loadingProgress") {
        this.state["viewports"][data[0]]["loading"] = data[1];
      } else if (field == "minSliceId") {
        this.state["viewports"][data[0]]["minSliceId"] = data[1];
      } else if (field == "maxSliceId") {
        this.state["viewports"][data[0]]["maxSliceId"] = data[1];
      } else if (field == "sliceId") {
        this.state["viewports"][data[0]]["sliceId"] = data[1];
      } else if (field == "defaultViewport") {
        this.state["viewports"][data[0]]["default"]["scale"] = data[1];
        this.state["viewports"][data[0]]["default"]["rotation"] = data[2];
        this.state["viewports"][data[0]]["default"]["translation"]["x"] =
          data[3];
        this.state["viewports"][data[0]]["default"]["translation"]["y"] =
          data[4];
        this.state["viewports"][data[0]]["default"]["voi"]["windowWidth"] =
          data[5];
        this.state["viewports"][data[0]]["default"]["voi"]["windowCenter"] =
          data[6];
      } else if (field == "manager") {
        this.state.manager = data;
      } else {
        if (data.length == 0) {
          this.state[field] = data;
        } else {
          this.state[data[0]][field] = data[1];
        }
      }
    }
  }

  /**
   * Get a value from the store
   * @function get
   * @param {Array} args - The array of arguments
   * @return {Object} - The stored value
   */
  get(...args) {
    if (this.VUEX_STORE) {
      if (this.vuex_module) {
        args.unshift(this.vuex_module);
      }
      return _get(this.vuex_store.state, args, "error");
    } else {
      return _get(this.state, args, "error");
    }
  }
}

/**
 * Instancing the store
 * @param {Object} vuex_store - The app vuex store [optional]
 * @param {String} vuex_module - The name of the vuex store module, can be null
 */

export function initLarvitarStore(vuex_store, vuex_module) {
  if (vuex_store) {
    larvitar_store = new Larvitar_Store(vuex_store, vuex_module);
  } else {
    larvitar_store = new Larvitar_Store();
  }
}
