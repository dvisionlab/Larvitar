/** @module imaging/store
 *  @desc This file provides functionalities
 *        for data config store.
 *  @todo Document
 */

// external libraries
import { get as _get } from "lodash";

/**
 * The Larvitar Internal Store
 */
export const larvitar_store = null;

/** Class representing the Larvitar Store. */
class Larvitar_Store {
  /**
   * Create the Larvitar Store
   */
  constructor(vuex_store) {
    this.VUEX_STORE = vuex_store ? true : false;
    this.vuex_store = vuex_store;
    this.state = {
      manager: null,
      viewer: "quadview",
      viewports: ["axial", "coronal", "sagittal"],
      orientation: null,
      leftMouseHandler: "Wwwc",
      series: [],
      seriesId: null,
      imageId: null,
      colormapId: "gray",
      axial: {
        ready: false,
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
          translation: {
            x: 0.0,
            y: 0.0
          },
          rotation: 0.0,
          voi: {
            windowCenter: 0.0,
            windowWidth: 0.0
          }
        },
        default: {
          scale: 0.0,
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
      },
      sagittal: {
        ready: false,
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
          scale: 1.0,
          translation: {
            x: 0.0,
            y: 0.0
          },
          rotation: 0.0,
          voi: {
            windowCenter: 0.0,
            windowWidth: 0.0
          }
        },
        default: {
          scale: 1.0,
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
      },
      coronal: {
        ready: false,
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
          scale: 1.0,
          translation: {
            x: 0.0,
            y: 0.0
          },
          rotation: 0.0,
          voi: {
            windowCenter: 0.0,
            windowWidth: 0.0
          }
        },
        default: {
          scale: 1.0,
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
      }
    };
  }

  /**
   * Enable the VUEX storage method
   * @function enableVuex
   */
  enableVuex() {
    // VUEX IS ENABLED BY DEFAULT
    this.VUEX_STORE = true;
  }

  /**
   * Disable the VUEX storage method
   * @function disableVuex
   */
  disableVuex() {
    // VUEX IS ENABLED BY DEFAULT
    this.VUEX_STORE = false;
  }

  /**
   * Set a value into store
   * @function set
   * @param {String} viewer - The name of the viewer, can be null
   * @param {field} field - The name of the field to be updated
   * @param {Object} data - The data object
   */
  set(viewer, field, data) {
    if (this.VUEX_STORE) {
      let dispatch = "set" + field[0].toUpperCase() + field.slice(1);
      let route = viewer ? viewer + "/" + dispatch : dispatch;
      this.vuex_store.dispatch(route, data);
    } else {
      if (field == "scale" || field == "rotation" || field == "translation") {
        this.state[data[0]]["viewport"][field] = data[1];
      } else if (field == "contrast") {
        this.state[data[0]]["viewport"]["voi"][field] = data[1];
      } else if (field == "dimensions") {
        this.state[data[0]]["rows"] = data[1];
        this.state[data[0]]["cols"] = data[2];
      } else if (field == "spacing") {
        this.state[data[0]]["spacing_x"] = data[1];
        this.state[data[0]]["spacing_y"] = data[2];
      } else if (field == "defaultViewport") {
        this.state[data[0]]["default"]["scale"] = data[1];
        this.state[data[0]]["default"]["translation"]["x"] = data[2];
        this.state[data[0]]["default"]["translation"]["y"] = data[3];
        this.state[data[0]]["default"]["voi"]["windowWidth"] = data[4];
        this.state[data[0]]["default"]["voi"]["windowCenter"] = data[5];
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
      return _get(this.vuex_store.state, args, "error");
    } else {
      return _get(this.state, args, "error");
    }
  }
}

/**
 * Instancing the store
 * @param {Object} vuex_store - The app vuex store [optional]
 */

export function initLarvitarStore(vuex_store) {
  if (vuex_store) {
    larvitar_store = new Larvitar_Store(vuex_store);
  } else {
    larvitar_store = new Larvitar_Store();
  }
}
