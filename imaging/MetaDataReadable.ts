//human readable dictionary
export  type MetaDataReadable =
{
    anonymized ?: boolean;
    seriesUID ?: string;
    instanceUID ?: string;
    studyUID ?: string;
    accessionNumber ?: string;
    studyDescription ?: string;
    patientName ?: string;
    patientBirthdate ?: string;
    seriesDescription ?: string;
    seriesDate ?: string;
    seriesModality ?: string;
    intercept ?: number|number[];
    slope ?: number|number[]; 
    //check if type is correct

    pixelSpacing ?: [number, number];
    sliceThickness ?: number|number[];
    imageOrientation ?:  [number, number, number, number, number, number];
    imagePosition ?: [number,number]|[number,number,number]|number[];
    rows ?: number;
    cols ?: number;
    numberOfSlices ?: number;
    numberOfFrames ?: number;
    frameTime ?: number;
    frameDelay ?: number;
    rWaveTimeVector ?: number[];
    isMultiframe ?: boolean;
    temporalPositionIdentifier ?: number;
    numberOfTemporalPositions ?: number;
    contentTime ?: string;
    is4D ?: boolean;
    windowCenter ?: number|number[];
    windowWidth ?: number|number[];
    minPixelValue ?: number;
    maxPixelValue ?: number;
    length ?: number;
    repr ?: string|null;
    mimeType ?: string;
}