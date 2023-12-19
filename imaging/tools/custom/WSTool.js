import cornerstoneTools from "cornerstone-tools";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);

const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");

/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "WS",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {},
      mixins: ["renderBrushMixin"],
    };

    super(props, defaultProps);
    this.lowerThreshold = 0;
    this.upperThreshold = 0;
    this.Mask_Array = [];
    this.src = null;
    this.touchDragCallback = this._paint.bind(this);

  }

  _changeRadius(evt) {
    console.log("CHANGERADIUS");

    const { configuration } = segmentationModule;
    const { deltaY } = evt;
    console.log("DELTAY",evt.deltaY)
    console.log(evt)
    configuration.radius += (deltaY > 0) ? 1 : -1;
    console.log(configuration.radius)
    configuration.radius = Math.max(configuration.radius, 1);

    external.cornerstone.updateImage(this.element);
  }


 /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
 async _paint(evt) {
 
    const { configuration } = segmentationModule;
    
    const eventData = evt.detail;
    const element=eventData.element;
    this.element=element;
    element.addEventListener("wheel",this._changeRadius.bind(this)
  );
    const { rows, columns } = eventData.image;
    const DICOMimage=eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    let circleArray = [];

    // threshold should be applied only if painting, not erasing
   
        circleArray = getCircle(radius, rows, columns, x, y);
        
    const dicomPixelData = DICOMimage.getPixelData();
    const {mean, stddev} = this._calculateStats(DICOMimage,
        dicomPixelData,
        circleArray
      );
      console.log(mean)
      console.log(stddev)
      const minThreshold = this.getMin(dicomPixelData)   
      const maxThreshold = this.getMax(dicomPixelData);
      const meanNorm=this.mapToRange(mean, minThreshold, maxThreshold);

      const stdDevNorm=this.mapToRange(stddev, minThreshold, maxThreshold);
      const XFactor=1.5;
      const lowerThreshold =  meanNorm- XFactor* stdDevNorm;
      const upperThreshold = meanNorm +XFactor * stdDevNorm;
      this.lowerThreshold=lowerThreshold;
      console.log(lowerThreshold)
      this.upperThreshold=upperThreshold;
      console.log(upperThreshold)
     
      const height = DICOMimage.height;
      const width = DICOMimage.width;
      let normalizedPixelData = new Uint8Array(width * height)
        for(let i=0;i<dicomPixelData.length;i++)
        {
                normalizedPixelData[i]=this.mapToRange(dicomPixelData[i], minThreshold, maxThreshold);
        }
        // Assuming 8-bit unsigned integer pixel values
        // Create a new array for PNG pixel data with 4 channels: RGB
        const pngPixelData = new Uint8Array(width * height * 4);
        // Function to convert DICOM pixel data to PNG pixel data
        for (let i = 0; i < dicomPixelData.length; i++) {
        const pixelValue = normalizedPixelData[i];

        // Assuming each integer represents a grayscale value
        pngPixelData[i * 4] = pixelValue; // Red channel
        pngPixelData[i * 4 + 1] = pixelValue; // Green channel
        pngPixelData[i * 4 + 2] = pixelValue; // Blue channel
        pngPixelData[i * 4 + 3] = 255; // Alpha channel (fully opaque)

        }

        // Create an OpenCV Mat object from the PNG pixel data
        let src = new cv.Mat(height, width, cv.CV_8UC4); // 3 channels: RGB
        src.data.set(pngPixelData);
        await this.WatershedSegmentation(src,dicomPixelData)
        // Draw / Erase the active color.
        this.drawBrushPixels(evt,
        this.Mask_Array,
        labelmap2D.pixelData,
        labelmap3D.activeSegmentIndex,
        columns,
        shouldErase
        );

    external.cornerstone.updateImage(evt.detail.element);
  }

   WatershedSegmentation(src,dicomPixelData){
  
    let dst = new cv.Mat();
    
    let gray = new cv.Mat();
    let opening = new cv.Mat();
    let Bg = new cv.Mat();
    let Fg = new cv.Mat();
   let distTrans = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    //gray and threshold image
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    console.log("LOWER",this.lowerThreshold)
    console.log("UPPER",this.upperThreshold)
    let lowerBinary = new cv.Mat();
    let upperBinary = new cv.Mat();

    cv.threshold(gray, lowerBinary, this.lowerThreshold, 255, cv.THRESH_BINARY);
    cv.threshold(gray, upperBinary, this.upperThreshold, 255, cv.THRESH_BINARY_INV);

    // Combine the binary masks using bitwise_and
    cv.bitwise_and(lowerBinary, upperBinary, gray);
    
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
    //const matrix = (rows, cols) => new Array(cols).fill(0).map((o, i) => new Array(rows).fill(0))
    //let mask=matrix(markers.rows,markers.cols);
    let columns=markers.cols;
    let rightleft = [];
    let rownumber=0;
    // Iterate through rows

    // Find left and right indices for each row

  for (let i = 0; i < dicomPixelData.length; i += columns) {
  let row = dicomPixelData.slice(i, i + columns);

  // Find the first non-zero value from the left
  let leftIndex = row.findIndex(value => value > 350);
  
  if (leftIndex === -1||leftIndex ===undefined) {
    leftIndex = row.length-1; // All values are zero
  }

  // Find the first non-zero value from the right
  let reversedRow = [...row]; // Create a copy before reversing
  let rightIndex = row.length - 1 - reversedRow.reverse().findIndex(value => value > 350);

  if (reversedRow.reverse().findIndex(value => value > 0) ===-1||rightIndex===undefined||rightIndex>=row.length) {
    rightIndex = row.length-1; // All values are zero
  }

  rightleft.push({ left: i + leftIndex, right: i + rightIndex });
}


    console.log(rightleft);
    
    let mask_array = [];
    for (let i = 0; i < markers.rows; i++) {
      for (let j = 0; j < markers.cols; j++) {
        if (markers.intPtr(i, j)[0] == -1) {
          // Border pixel
          if(i===0|| j===0||i===markers.rows-1||j===markers.cols-1)
          {
            mask_array.push(0);
          }
          else{
            mask_array.push(1);
          }
          
         
        } else if (markers.intPtr(i, j)[0] > 1) {
          // Inside pixel (non-zero marker values)
          mask_array.push(1);
        } else {
          // Background pixel (marker value == 0)
          mask_array.push(0);
        }
      }
    }
    // Iterate through rows

// Iterate through rows
for (let i = 0; i < dicomPixelData.length; i += columns) {
  let rowStartIndex = i / columns;

  // Iterate from the beginning of the row to the left non-zero value
  for (let j = i; j < rightleft[rowStartIndex].left; j++) {
    mask_array[j]=0;
  }

  // Iterate from the right non-zero value to the end of the row
  for (let k = rightleft[rowStartIndex].right; k < i + columns; k++) {
    mask_array[k]=0;
  }
}

    console.log(mask_array);

        //use mask array to mask a DICOM image 
    src.delete(); dst.delete(); gray.delete(); opening.delete(); Bg.delete();
    Fg.delete(); distTrans.delete(); unknown.delete(); markers.delete(); M.delete();
    //pixel_array = imageObject.metadata.x7fe00010;
    this.Mask_Array=mask_array;
    console.log(this.Mask_Array)
    
      }

      drawBrushPixels(evt,
        mask,
        pixelData,
        segmentIndex,
        columns,shouldErase
      ) {
      
        for(let i=0;i<mask.length;i++){
          let point=mask[i];
          const spIndex = i;
          if (shouldErase) {
            this.eraseIfSegmentIndex(spIndex, pixelData, segmentIndex);
          } else {
            if (point === 1) {
            pixelData[spIndex] = segmentIndex;
        }else if(point === 0)
        {
            pixelData[spIndex] = 0;
        }
    
          }
        };
        
        let points=this.mask;
        let operationData={pixelData,
          segmentIndex,points}
          console.log(operationData)
        //fillFreehand(evt, operationData, true)

      }
    
      eraseIfSegmentIndex(
        pixelIndex,
        pixelData,
        segmentIndex
      ) {
        if (pixelData[pixelIndex] === segmentIndex) {
          pixelData[pixelIndex] = 0;
        }
      }
    
      _calculateStats(image,imagePixelData, circleArray) {
    
        let sum = 0;
        let sumSquaredDiff = 0;
      
        circleArray.forEach(([x, y]) => {
          const value = imagePixelData[y * image.rows + x];
          
          sum += value;
          sumSquaredDiff += value * value;
        });
        
        const count = circleArray.length;
        
        const mean = sum / count;
        
        const variance = (sumSquaredDiff / count) - (mean * mean);
        const stddev = Math.sqrt(variance);
     
        return { mean, stddev };
      }
    
      getMax(arr) {
        let len = arr.length;
       let max = -Infinity;
     
       while (len--) {
           max = arr[len] > max ? arr[len] : max;
       }
       return max;
     }
     getMin(arr) {
       let len = arr.length;
       let min = +Infinity;
     
       while (len--) {
           min = arr[len] < min ? arr[len] : min;
       }
       return min;
     }
     mapToRange(value, inMin, inMax) {
        return ((value - inMin) / (inMax - inMin)) * 255;
    }
}
