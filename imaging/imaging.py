import numpy as np
import nrrd

# write the .nrrd file from numpy array and metadata
def write_nrrd(outputFilePath, data, metadata):

    origin = metadata['volume']['imagePosition']
    z_orientation = np.cross(metadata['volume']['imageOrientation'][:3], metadata['volume']['imageOrientation'][3:]);
    orientation = np.array([
                           [metadata['volume']['pixelSpacing'][0] * metadata['volume']['imageOrientation'][0],
                            metadata['volume']['pixelSpacing'][1] * metadata['volume']['imageOrientation'][1],
                            metadata['volume']['sliceThickness'] * metadata['volume']['imageOrientation'][2]],
                           [metadata['volume']['pixelSpacing'][0] * metadata['volume']['imageOrientation'][3],
                            metadata['volume']['pixelSpacing'][1] * metadata['volume']['imageOrientation'][4],
                            metadata['volume']['sliceThickness'] * metadata['volume']['imageOrientation'][5]],
                           [metadata['volume']['pixelSpacing'][0] * z_orientation[0],
                            metadata['volume']['pixelSpacing'][1] * z_orientation[1],
                            metadata['volume']['sliceThickness'] * z_orientation[2]]])

    header = {
        'kinds': ['domain', 'domain', 'domain'],
        'dimension': 3,
        'space': 'left-posterior-superior',
        'space origin': origin,
        'space directions': orientation,
        'encoding': 'raw'
    }
    nrrd.write(outputFilePath, data, header, index_order='C');

# read the .nrrd file and return the numpy array
def read_nrrd(outputFilePath):
    data, header = nrrd.read(outputFilePath)
    return data
