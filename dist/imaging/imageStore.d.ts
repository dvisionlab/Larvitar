/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */
import { MetadataValue } from "./types";
type StoreSeries = {
    imageIds: string[];
    progress: number;
};
type Store = {
    colormapId: string;
    errorLog: string;
    leftActiveTool: string;
    rightActiveTool: string;
    series: {
        [seriesUID: string]: StoreSeries;
    };
    viewports: {
        [key: string]: typeof DEFAULT_VIEWPORT;
    };
    [key: string]: any;
};
declare const DEFAULT_VIEWPORT: {
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
};
export declare const set: (field: string, payload: string | Array<MetadataValue>) => void;
declare const _default: {
    initialize: () => void;
    addViewport: (name: string) => void;
    deleteViewport: (name: string) => void;
    addSeriesId: (seriesId: string, imageIds: string[]) => void;
    removeSeriesId: (seriesId: string) => void;
    resetSeriesIds: () => void;
    setSliceId: (elementId: string, imageIndex: number) => void;
    setMaxSliceId: (elementId: string, imageIndex: number) => void;
    get: (props: string | string[]) => any;
    addStoreListener: (listener: (data: Store) => {}) => (data: Store) => {};
    removeStoreListener: () => undefined;
    addViewportListener: (elementId: string, listener: (data: typeof DEFAULT_VIEWPORT) => {}) => void;
    removeViewportListener: (elementId: string) => void;
    addSeriesListener: (seriesId: string, listener: (data: StoreSeries) => {}) => void;
    removeSeriesListener: (seriesId: string) => void;
};
export default _default;
