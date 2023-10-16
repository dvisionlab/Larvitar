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
    intercept ?: number;
    slope ?: number ; 
    //check if type is correct

    pixelSpacing ?: string;
    sliceThickness ?: string;
    imageOrientation ?:  [number, number, number, number, number, number];
    imagePosition ?: number[];
    rows ?: number;
    cols ?: number;
    numberOfSlices ?: number;
    numberOfFrames ?: number;
    frameTime ?: string;
    frameDelay ?: string;
    rWaveTimeVector ?: number;
    isMultiframe ?: boolean;
    temporalPositionIdentifier ?: number;
    numberOfTemporalPositions ?: number;
    contentTime ?: string;
    is4D ?: boolean;
    windowCenter ?: string;
    windowWidth ?: string;
    minPixelValue ?: number;
    maxPixelValue ?: number;
    length ?: number;
    repr ?: string;
    mimeType ?: string;
}