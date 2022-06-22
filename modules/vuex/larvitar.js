// Larvitar Vuex storage

import Vue from "vue";

// default viewport store object
const DEFAULT_VIEWPORT = {
  ready: false, // true when currentImageId is rendered
  minSliceId: 0,
  maxSliceId: 0,
  sliceId: 0,
  minTimeId: 0,
  maxTimeId: 0,
  timeId: 0,
  timestamp: 0,
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

export default {
  namespaced: true,
  state: {
    colormapId: "gray",
    leftActiveTool: "Wwwc",
    rightActiveTool: "Wwwc",
    series: {}, // seriesUID: {imageIds:[], progress:value}
    viewports: {}
  },
  getters: {
    viewport: state => id => state.viewports[id]
  },
  mutations: {
    canvas: (state, { id, d }) => {
      if (!state.viewports[id]) {
        console.warn(`Can not update viewport ${id}: viewport not found.`);
        return;
      }

      Vue.set(state.viewports[id], "viewport", {
        ...state.viewports[id].viewport,
        ...d
      });
    },
    series: (state, { id, d }) =>
      Vue.set(state.series, id, { ...state.series[id], ...d }),
    viewport: (state, { id, d }) => {
      if (!state.viewports[id]) {
        console.warn(`Can not update viewport ${id}: viewport not found.`);
        return;
      }

      Vue.set(state.viewports, id, { ...state.viewports[id], ...d });
    },
    leftActiveTool: (state, { d }) => {
      state.leftActiveTool = d.value;
    },
    rightActiveTool: (state, { d }) => {
      state.rightActiveTool = d.value;
    }
  },
  actions: {
    addViewport: ({ state }, viewportId) => {
      if (!state.viewports[viewportId])
        Vue.set(state.viewports, viewportId, DEFAULT_VIEWPORT);
      // else preserve already stored viewport (remove it manually if you want to reset it)
    },
    deleteViewport: ({ state }, viewportId) =>
      Vue.delete(state.viewports, viewportId),
    setLeftActiveTool: ({ commit }, value) => {
      commit("leftActiveTool", { d: { value } });
    },
    setRightActiveTool: ({ commit }, value) => {
      commit("rightActiveTool", { d: { value } });
    },
    removeSeriesIds: ({ state }, seriesId) =>
      Vue.delete(state.series, seriesId),
    resetSeriesIds: ({ state }) => Vue.set(state.series, {}),
    setErrorLog: () => {}, // TODO LT pass elementId

    // Series fields setters
    addSeriesIds: ({ commit }, [id, imageIds]) =>
      commit("series", { id, d: { imageIds } }),
    // !!! this is CACHE progress
    setProgress: ({ commit }, [id, progress]) =>
      commit("series", { id, d: { progress } }),
    // Viewport fields setters
    setDimensions: ({ commit }, [id, rows, cols]) =>
      commit("viewport", { id, d: { rows, cols } }),
    setRenderingStatus: ({ commit }, [id, ready]) =>
      commit("viewport", { id, d: { ready } }),
    setSpacing: ({ commit }, [id, spacing_x, spacing_y]) =>
      commit("viewport", { id, d: { spacing_x, spacing_y } }),
    setThickness: ({ commit }, [id, thickness]) =>
      commit("viewport", { id, d: { thickness } }),
    setMinPixelValue: ({ commit }, [id, minPixelValue]) =>
      commit("viewport", { id, d: { minPixelValue } }),
    setMaxPixelValue: ({ commit }, [id, maxPixelValue]) =>
      commit("viewport", { id, d: { maxPixelValue } }),
    setMinSliceId: ({ commit }, [id, minSliceId]) =>
      commit("viewport", { id, d: { minSliceId } }),
    setMaxSliceId: ({ commit }, [id, maxSliceId]) =>
      commit("viewport", { id, d: { maxSliceId } }),
    setSliceId: ({ commit }, [id, sliceId]) =>
      commit("viewport", { id, d: { sliceId } }),
    setMinTimeId: ({ commit }, [id, minTimeId]) =>
      commit("viewport", { id, d: { minTimeId } }),
    setMaxTimeId: ({ commit }, [id, maxTimeId]) =>
      commit("viewport", { id, d: { maxTimeId } }),
    setTimeId: ({ commit }, [id, timeId]) =>
      commit("viewport", { id, d: { timeId } }),
    setTimestamp: ({ commit }, [id, timestamp]) =>
      commit("viewport", { id, d: { timestamp } }),
    setIsColor: ({ commit }, [id, isColor]) =>
      commit("viewport", { id, d: { isColor } }),
    setIsMultiframe: ({ commit }, [id, isMultiframe]) =>
      commit("viewport", { id, d: { isMultiframe } }),
    setIsTimeserie: ({ commit }, [id, isTimeserie]) =>
      commit("viewport", { id, d: { isTimeserie } }),
    setDefaultViewport: (
      { commit },
      [id, scale, rotation, x, y, windowWidth, windowCenter]
    ) =>
      commit("viewport", {
        id,
        d: {
          default: {
            scale,
            rotation,
            translation: { x, y },
            voi: { windowWidth, windowCenter }
          }
        }
      }),
    // viewports[id].viewport properties
    setScale: ({ commit }, [id, scale]) =>
      commit("canvas", { id, d: { scale } }),
    setRotation: ({ commit }, [id, rotation]) =>
      commit("canvas", { id, d: { rotation } }),
    setTranslation: ({ commit }, [id, translation]) =>
      commit("canvas", { id, d: { translation } }),
    setContrast: ({ commit }, [id, windowWidth, windowCenter]) =>
      commit("canvas", { id, d: { voi: { windowWidth, windowCenter } } })
  }
};
