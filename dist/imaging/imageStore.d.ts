/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */
import type { StoreViewport } from "./types.d";
type StoreSeries = {
    imageIds: string[];
    progress: number;
    elementId: string;
};
type Store = {
    colormapId: string;
    errorLog: string;
    leftActiveTool?: string;
    rightActiveTool?: string;
    series: {
        [seriesUID: string]: StoreSeries;
    };
    viewports: {
        [key: string]: StoreViewport;
    };
    [key: string]: any;
};
type SetPayload = ["errorLog" | "leftActiveTool" | "rightActiveTool", string] | [
    ("isColor" | "isMultiframe" | "isPDF" | "waveform" | "dsa" | "isTimeserie" | "isDSAEnabled" | "ready"),
    string,
    boolean
] | [
    ("progress" | "loading" | "minPixelValue" | "maxPixelValue" | "minSliceId" | "maxSliceId" | "minTimeId" | "maxTimeId" | "rotation" | "scale" | "sliceId" | "timeId" | "thickness" | "numberOfFrames" | "numberOfTemporalPositions"),
    string,
    number
] | ["timestamp", string, number | undefined] | ["seriesUID", string, string | undefined] | ["pendingSliceId", string, number | undefined] | ["timestamps" | "timeIds" | "pixelShift", string, number[]] | [
    "contrast" | "dimensions" | "spacing" | "translation",
    string,
    number,
    number
] | [
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
export declare const set: (payload: SetPayload) => void;
declare const _default: {
    initialize: () => void;
    addViewport: (name: string) => void;
    deleteViewport: (name: string) => void;
    addSeriesId: (seriesId: string, imageIds: string[]) => void;
    removeSeriesId: (seriesId: string) => void;
    resetSeriesIds: () => void;
    setSliceId: (elementId: string, imageIndex: number) => void;
    setPendingSliceId: (elementId: string, imageIndex: number) => void;
    setMaxSliceId: (elementId: string, imageIndex: number) => void;
    setTimeId: (elementId: string, timeIndex: number) => void;
    setDSAEnabled: (elementId: string, enabled: boolean) => void;
    setDSAPixelShift: (elementId: string, pixelShift: number[]) => void;
    get: (props: string | string[] | undefined) => any;
    addStoreListener: (listener: (data: Store) => {}) => (data: Store) => {};
    removeStoreListener: () => undefined;
    addViewportListener: (elementId: string, listener: (data: StoreViewport) => {}) => void;
    removeViewportListener: (elementId: string) => void;
    addSeriesListener: (seriesId: string, listener: (data: StoreSeries) => {}) => void;
    removeSeriesListener: (seriesId: string) => void;
};
export default _default;
