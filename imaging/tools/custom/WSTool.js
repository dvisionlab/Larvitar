const cornerstoneTools = larvitar.cornerstoneTools;
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);

const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");
// State
const getToolState = cornerstoneTools.getToolState;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
// Drawing
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawRect = cornerstoneTools.importInternal("drawing/drawRect");
const drawLinkedTextBox = cornerstoneTools.importInternal("drawing/drawLinkedTextBox");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const drawBrushPixels = segmentationUtils.drawBrushPixels;
// Util
const calculateSUV = cornerstoneTools.importInternal("util/calculateSUV");
const getROITextBoxCoords = cornerstoneTools.importInternal("util/getROITextBoxCoords");
const numbersWithCommas = cornerstoneTools.importInternal("util/numbersWithCommas");
const throttle = cornerstoneTools.importInternal("util/throttle");
const { rectangleRoiCursor } = cornerstoneTools.importInternal("tools/cursors");
const getLogger = cornerstoneTools.importInternal("util/getLogger");
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const getModule = cornerstoneTools.getModule;
const logger = getLogger("tools:annotation:RectangleRoiTool");
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
          mixins: ["renderBrushMixin"]
        };
    
        super(props, defaultProps);
        this.lowerThreshold = 0;
this.upperThreshold = 0;
this.Mask_Array = [];
        this.touchDragCallback = this._paint.bind(this);
    }

   
 /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
 _paint(evt) {
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
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
    const {mean, stdDev} = this._calculateStats(DICOMimage,
        dicomPixelData,
        circleArray
      );
     
      const minThreshold = this.getMin(dicomPixelData)   
      const maxThreshold = this.getMax(dicomPixelData);
      const meanNorm=this.mapToRange(mean, minThreshold, maxThreshold);

      const stdDevNorm=this.mapToRange(stdDev, minThreshold, maxThreshold);
      const XFactor=0.7;
      const lowerThreshold =  meanNorm- XFactor* stdDevNorm;
      const upperThreshold = meanNorm + XFactor * stdDevNorm;
      this.lowerThreshold=lowerThreshold;
      this.upperThreshold=upperThreshold;
     
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
        this.WatershedSegmentation(src,upperThreshold)
        // Draw / Erase the active color.
        this.drawBrushPixels(
        this.Mask_Array,
        labelmap2D.pixelData,
        labelmap3D.activeSegmentIndex,
        columns,
        shouldErase
        );

    external.cornerstone.updateImage(evt.detail.element);
  }

  WatershedSegmentation(src,upperThreshold){
  
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
    this.Mask_Array=mask_array;
    
      }

      drawBrushPixels(
        mask,
        pixelData,
        segmentIndex,
        columns,shouldErase
      ) {
        const getPixelIndex = (x, y) => y * columns + x;
      
        mask.forEach(point => {
          const spIndex = getPixelIndex(...point);
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
        });
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

