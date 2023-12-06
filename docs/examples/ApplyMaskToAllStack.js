

export function ApplyMaskToAllSTack(minThreshold,maxThreshold,Mask_Array){

    //let pngMaskedImages = [];
    let modifiedimages=[]
    for (let i = 0; i < stack.imageIds.length; i++) { 

      let image=larvitar.cornerstone.imageCache.cachedImages[i].image;//stack image extract s
      let height = image.height;
      let width =image.width;
      let dicomPixelDatanew = image.getPixelData();
      
      let normalizedPixelDatanew = new Uint8Array(width * height)
      
      for(let i=0;i<dicomPixelDatanew.length;i++)
      {
                normalizedPixelDatanew[i]=mapToRange(dicomPixelDatanew[i], minThreshold, maxThreshold);
      }
      // Assuming 8-bit unsigned integer pixel values
      // Create a new array for PNG pixel data with 4 channels: RGB
      let pngPixelDatanew = new Uint8Array(width * height * 4);
      // Function to convert DICOM pixel data to PNG pixel data
      for (let i = 0; i < dicomPixelData.length; i++) {
        let pixelValuenew = normalizedPixelDatanew[i];
      
        // Assuming each integer represents a grayscale value
        pngPixelDatanew[i * 4] = pixelValuenew; // Red channel
        pngPixelDatanew[i * 4 + 1] = pixelValuenew; // Green channel
        pngPixelDatanew[i * 4 + 2] = pixelValuenew; // Blue channel
        pngPixelDatanew[i * 4 + 3] = 255; // Alpha channel (fully opaque)
      
      }

      // Create an OpenCV Mat object from the PNG pixel data
      let src = new cv.Mat(height, width, cv.CV_8UC4); // 3 channels: RGB
      src.data.set(pngPixelDatanew);

            // Now 'src' is an OpenCV Mat object representing the PNG image
              let Mask_Array=WatershedSegmentation(src, lowerThreshold,upperThreshold)
              let modifiedImage=Applymask_onDICOM(Mask_Array,dicomPixelDatanew,image,minThreshold,maxThreshold)
              modifiedimages.push(modifiedImage)
}
}
function mapToRange(value, inMin, inMax) {
    return ((value - inMin) / (inMax - inMin)) * 255;
}

function WatershedSegmentation(src,lowerThreshold,upperThreshold){


    let dst = new cv.Mat();
    
    let gray = new cv.Mat();
    let opening = new cv.Mat();
    let Bg = new cv.Mat();
    let Fg = new cv.Mat();
    let distTrans = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    // gray and threshold image
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    cv.threshold(gray, gray, upperThreshold, 255, cv.THRESH_BINARY);
    
    // get background
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.erode(gray, gray, M);
    cv.dilate(gray, opening, M);
    cv.dilate(opening, Bg, M, new cv.Point(-1, -1), 1);
    // distance transform
    cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
    cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
    // get foreground
    cv.threshold(distTrans, Fg, 0.01, 255, cv.THRESH_BINARY);
    Fg.convertTo(Fg, cv.CV_8U, 1, 0);
    cv.subtract(Bg, Fg, unknown);
    // get connected components markers
    cv.connectedComponents(Fg, markers);
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
         markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
            if (unknown.ucharPtr(i, j)[0] == 255) {
                markers.intPtr(i, j)[0] = 0;
            }
            }
    }
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    cv.watershed(src, markers);
    // draw barriers
    const matrix = (rows, cols) => new Array(cols).fill(0).map((o, i) => new Array(rows).fill(0))
    //let mask=matrix(markers.rows,markers.cols);
    let mask_array=[];
    
    for (let i = 0; i < markers.rows; i++) {
        for (let j = 0; j < markers.cols; j++) {
                    //mask[i][j]=0;
                    
            if (markers.intPtr(i, j)[0] == -1) {
                    //mask[i][j]=1;
                    mask_array.push(1);
                    src.ucharPtr(i, j)[0] = 255; // R
                    src.ucharPtr(i, j)[1] = 0; // G
                    src.ucharPtr(i, j)[2] = 0; // B
                }
                else{
                  mask_array.push(0);
                }
            }
        }
    
        //use mask array to mask a DICOM image 
    src.delete(); dst.delete(); gray.delete(); opening.delete(); Bg.delete();
    Fg.delete(); distTrans.delete(); unknown.delete(); markers.delete(); M.delete();
    //pixel_array = imageObject.metadata.x7fe00010;
    return Mask_Array;
      }
    
    function Applymask_onDICOM(
        Mask_Array,
        dicomPixelData,DICOMimage,minThreshold,maxThreshold
      ){
    
      let array=new Array(dicomPixelData.length)
      for(let i=0;i<dicomPixelData.length;i++)
      {
        if(Mask_Array[i]===0)
        {array[i * 4]=dicomPixelData[i]
          array[i * 4+1]=dicomPixelData[i]
          array[i * 4+2]=dicomPixelData[i]
          array[i * 4+3]=255
        }
        else if(Mask_Array[i]===1)
        {
          array[i*4]=maxThreshold;
          array[i * 4+1]=0
          array[i * 4+2]=0
          array[i * 4+3]=1
        }
      }
    
      let modifiedImage = {
        imageId: DICOMimage.imageId, // Keep the same imageId
        minPixelValue:minThreshold,
        maxPixelValue: maxThreshold,
        slope: DICOMimage.slope,
        intercept: DICOMimage.intercept,
        windowCenter: DICOMimage.windowCenter,
        windowWidth: DICOMimage.windowWidth,
        getPixelData: () => array,
        rows: DICOMimage.rows,
        columns: DICOMimage.columns,
        height: DICOMimage.height,
        width: DICOMimage.width,
        color: true,
        columnPixelSpacing: DICOMimage.columnPixelSpacing,
        rowPixelSpacing: DICOMimage.rowPixelSpacing,
      };
    
    return modifiedImage
      //larvitar.addDefaultTools();
      }