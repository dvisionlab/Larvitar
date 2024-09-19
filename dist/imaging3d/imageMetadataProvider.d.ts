declare function add(imageId: string, metadata: any): void;
declare function get(type: string, imageId: string): any;
export declare const imageMetadataProvider: {
    add: typeof add;
    get: typeof get;
};
export {};
