// Larvitare storage

import Vue from "vue";

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
    leftMouseHandler: "Wwwc",
    manager: null,
    series: {}, // seriesUID: [imageIds]
    viewports: {}
  },
  getters: {
    viewport: state => id => state.viewports[id]
  },
  mutations: {
    viewport: (state, { id, d }) => {
      if (!state.viewports[id]) {
        console.warn(`Can not update viewport ${id}: viewport not found.`);
        return;
      }

      Vue.set(state.viewports, id, { ...state.viewports[id], ...d });
    }
  },
  actions: {
    // TODO SERIES OBJ NOW IS SERIES: {imageIds: [], progress: value}
    // UPDATE ADD SERIESIDS
    // ADD setProgress(seriesId, value)
    addSeriesIds: ({ state }, { imageIds, seriesId }) =>
      Vue.set(state.series, seriesId, imageIds),
    addViewport: ({ state }, viewportId) => {
      if (!state.viewports[viewportId])
        Vue.set(state.viewports, viewportId, DEFAULT_VIEWPORT);
      // else preserve already stored viewport (remove it manually if you want to reset it)
    },
    deleteViewport: ({ state }, viewportId) =>
      Vue.delete(state.viewports, viewportId),
    setManager: ({ state }, value) => (state.manager = value),
    removeSeriesIds: ({ state }, seriesId) =>
      Vue.delete(state.series, seriesId),
    setErrorLog: () => {}, // TODO LT pass elementId

    // Viewport fields setters
    setDimensions: ({ commit }, [id, rows, cols]) =>
      commit("viewport", { id, d: { rows, cols } }),
    setLoadingStatus: ({ commit }, [id, ready]) =>
      commit("viewport", { id, d: { ready } }),
    setLoadingProgress: ({ commit }, [id, loading]) =>
      commit("viewport", { id, d: { loading } }),
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
    setScale: ({ commit }, [id, scale]) =>
      commit("viewport", { id, d: { scale } }),
    setRotation: ({ commit }, [id, rotation]) =>
      commit("viewport", { id, d: { rotation } }),
    setTranslation: ({ commit }, [id, translation]) =>
      commit("viewport", { id, d: { translation } }),
    setContrast: ({ commit }, [id, windowWidth, windowCenter]) =>
      commit("viewport", { id, d: { voi: { windowWidth, windowCenter } } })
  }
};
