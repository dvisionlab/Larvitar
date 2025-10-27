/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */
import type { StoreViewport } from "./types";
import { ICamera, VolumeViewport } from "../imaging3d/types";
type StoreSeries = {
    imageIds: string[];
    imageIds3D?: string[];
    progress: number;
    elementId: string;
    cached: {
        [imageId: string]: boolean;
    };
};
type Store = {
    colormapId: string;
    errorLog: string;
    leftActiveTool?: string;
    rightActiveTool?: string;
    series: {
        [uniqueUID: string]: StoreSeries;
    };
    viewports: {
        [key: string]: StoreViewport;
    };
    [key: string]: any;
};
type SetPayload = ["errorLog" | "leftActiveTool" | "rightActiveTool", string] | [
    ("isColor" | "isMultiframe" | "isVideo" | "isVideoSupported" | "isPDF" | "waveform" | "dsa" | "isTimeserie" | "isDSAEnabled" | "ready"),
    string,
    boolean
] | [
    ("progress" | "loading" | "minPixelValue" | "maxPixelValue" | "minSliceId" | "maxSliceId" | "minTimeId" | "maxTimeId" | "rotation" | "scale" | "sliceId" | "timeId" | "thickness" | "numberOfFrames" | "numberOfTemporalPositions"),
    string,
    number
] | ["cached", string, string, boolean] | ["timestamp", string, number | undefined] | [
    "uniqueUID" | "modality" | "filterName" | "colormapName",
    string,
    string | undefined
] | ["pendingSliceId", string, number | undefined] | ["timestamps" | "timeIds", string, number[]] | ["pixelShift", string, number[] | undefined] | [
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
] | ["camera", string, ICamera] | ["mpr", string, VolumeViewport];
export declare const set: (payload: SetPayload) => void;
declare const _default: {
    initialize: () => void;
    addViewport: (name: string) => void;
    deleteViewport: (name: string) => void;
    addImageIds: (uniqueUID: string, imageIds: string[]) => void;
    removeImageIds: (uniqueUID: string) => void;
    resetImageIds: () => void;
    addImageIds3D: (uniqueUID: string, imageIds3D: string[]) => void;
    setSliceId: (elementId: string, imageIndex: number) => void;
    setPendingSliceId: (elementId: string, imageIndex: number) => void;
    setMaxSliceId: (elementId: string, imageIndex: number) => void;
    setTimeId: (elementId: string, timeIndex: number) => void;
    setDSAEnabled: (elementId: string, enabled: boolean) => void;
    setDSAPixelShift: (elementId: string, pixelShift?: number[]) => void;
    setImageFilter: (elementId: string, filterName: string) => void;
    setImageColormap: (elementId: string, colormapName: string) => void;
    setCamera: (elementId: string, camera: ICamera) => void;
    resetActiveTools(): void;
    get: (props: string | string[] | undefined) => any;
    addStoreListener: (listener: (data: Store) => {}) => (data: Store) => {};
    removeStoreListener: () => undefined;
    addViewportListener: (elementId: string, listener: (data: StoreViewport) => {}) => void;
    removeViewportListener: (elementId: string) => void;
    addSeriesListener: (uniqueUID: string, listener: (data: StoreSeries) => {}) => void;
    removeSeriesListener: (uniqueUID: string) => void;
};
export default _default;
