/** @module imaging/store
 *  @desc This file provides functionalities
 *        for data config store.
 *  @todo Document
 */

// external libraries
import { get as _get } from "lodash";

import { default as vuex_store } from "@/store/index";

export default class Larvitar_Store {
  constructor() {
    this.VUEX_STORE = true;
    this.state = {
      viewer: "quadview",
      viewports: ["axial", "coronal", "sagittal"],
      orientation: null,
      leftMouseHandler: "Wwwc",
      series: [],
      seriesId: null,
      imageId: null,
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

  enableVuex() {
    this.VUEX_STORE = true;
  }

  disableVuex() {
    this.VUEX_STORE = false;
  }

  set(viewer, field, data) {
    if (this.VUEX_STORE) {
      let dispatch = "set" + field[0].toUpperCase() + field.slice(1);
      let route = viewer ? viewer + "/" + dispatch : dispatch;
      vuex_store.dispatch(route, data);
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

  get(...args) {
    if (this.VUEX_STORE) {
      return _get(vuex_store.state, args, "error");
    } else {
      return _get(this.state, args, "error");
    }
  }
}
