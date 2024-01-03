/*
TODO: check if label number is sufficient 
TODO: apply on the whole volume the thresholded WS
*/
//watershed segmentation is useful to segment features with distinguishable greyscale values that are
//difficult to distinguish between them, in order to extract quantitative information
//(see example here https://www.geeksforgeeks.org/image-segmentation-with-watershed-algorithm-opencv-python/)

// external libraries
import cornerstoneTools from "cornerstone-tools";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");
const getToolState = cornerstoneTools.getToolState;
// internal libraries
import store, { set as setStore } from "../../imageStore";

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
    this.lowerThreshold = null;
    this.upperThreshold = null;
    this.maskArray = null;
    this.src = null;
    this.dicomPixelData = null;
    this.minThreshold = null;
    this.pixelData=null;
    this.seriesUID=null;
    this.maxThreshold = null;
    this.segmentIndex=1;
    this.indexImage=0;
    this.imageId=null;
    this.seriesId=null;
    this.labelToErase=null;
    this._handleMouseMove = this._handleMouseMove.bind(this);
    document.addEventListener('mousemove', this._handleMouseMove);
  }
  /**
   * Allows to get the canvas element when going over it with mouse
   * TODO check with multiple canvas and layouts 
   *@name _handleMouseMove
   * @protected
   * @param  {MoveEvent} evt The mouse cursor moving event 
   * @returns {void}
   */
  _handleMouseMove(e) {
    if (document.elementFromPoint(e.pageX, e.pageY).classList.contains("cornerstone-canvas")) {
      // Remove the event listener when the condition is met
      document.removeEventListener('mousemove', this._handleMouseMove);

      // Your existing code here
      this.element = document.elementFromPoint(e.pageX, e.pageY).parentElement;
      this.element.addEventListener("wheel", this._changeRadius.bind(this));
      console.log(this.element);
    }
  }

  /**
   * Changes the radius of the brush
   *@method
   * @name _changeRadius
   * @protected
   * @param  {scrollEvent} evt The data object associated with the event.
   * @returns {void}
   */
  _changeRadius(evt) {
    if(evt.ctrlKey == true)
    {
    const { configuration } = segmentationModule;
    const { deltaY } = evt;

    configuration.radius += deltaY > 0 ? 1 : -1;

    configuration.radius = Math.max(configuration.radius, 1);

    external.cornerstone.updateImage(this.element);
    evt.preventDefault();//modify custom mouse scroll to not interefere with ctrl+wheel
    }
  }
 /**
   * Event handler for MOUSE_DRAG event.
   *
   * @override
   * @abstract
   * @event
   * @param {Object} evt - The event.
   */
 _handleMouseDrag(evt) {//TODO, INSERT IT FOR MAUAL ERASING
  let shouldEraseManually=evt.detail.event.altKey 
  if (evt.buttons === 1&&shouldEraseManually) {
    this._paint(evt);
}
}
  /**
   * Paints the data to the labelmap.
   *@name _paint
   * @protected
   * @param  {ClickEvent} evt The data object associated with the event.
   * @returns {void}
   */
  async _paint(evt) {//TODO CHECK IF A Connectivity Analysi Algorithm is necessary (depth-first search)
    
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const element = eventData.element;
    this.element = element;
    const viewport = store.get(["viewports", this.element.id]);

      element.addEventListener("wheel", this._changeRadius.bind(this));
   
      const toolData = getToolState(element, "stack");
      const stackData = toolData.data[0];
    const image = eventData.image;
    if(image.imageId!=this.imageId||viewport.seriesUID!=this.seriesUID)//||store.get(["viewports", this.element.id]).seriesUID!=this.seriesId
    {
      this.dicomPixelData = null;
      this.minThreshold = null;
      this.maxThreshold = null;
      this.segmentIndex=1;
      this.pixelData=(this.seriesUID != viewport.seriesUID)?null:this.pixelData
      this.slicesNumber=(this.seriesUID != viewport.seriesUID)?null:stackData.imageIds.length
    }
    //this.seriesId=store.get(["viewports", this.element.id]).seriesUID;
    this.imageId=image.imageId;
    this.indexImage = stackData.imageIds.indexOf(this.imageId);
    this.seriesUID=viewport.seriesUID;
    const { rows, columns } = image;
    
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    let shouldEraseManually=evt.detail.event.altKey 
    console.log(evt)
    let circleArray = getCircle(radius, rows, columns, x, y);
    if ((shouldErase===false||shouldErase===undefined)&&(shouldEraseManually===false||shouldEraseManually===undefined)){
      this.labelToErase=null;
 // threshold should be applied only if painting, not erasing
 if (this.dicomPixelData === null) {
  this.dicomPixelData = image.getPixelData();
}

const dicomPixelData = this.dicomPixelData;

const { mean, stddev } = this._calculateStats(
  image,
  dicomPixelData,
  circleArray
);

console.log("MEAN", mean);
console.log("STDDEV", stddev);

this.minThreshold =
  this.minThreshold === null
    ? this.getMin(dicomPixelData)
    : this.minThreshold;
this.maxThreshold =
  this.maxThreshold === null
    ? this.getMax(dicomPixelData)
    : this.maxThreshold;

const meanNorm = this.mapToRange(
  mean,
  this.minThreshold,
  this.maxThreshold
);
const stdDevNorm = this.mapToRange(
  stddev,
  this.minThreshold,
  this.maxThreshold
);

let xFactor = 2;
this.xFactor=xFactor;
this.lowerThreshold = meanNorm - xFactor * stdDevNorm;
this.upperThreshold = meanNorm + xFactor * stdDevNorm;

this.width = this.height || image.height;
this.height = this.width || image.width;
this.slicesNumber=this.slicesNumber||stackData.imageIds.length;
this.maskArray=new Array(this.slicesNumber)
this.pixelData=new Array(this.slicesNumber)
for(let i=0;i<this.slicesNumber;i++)
{
  let newimage= cornerstone.imageCache.cachedImages[i].image
  if(newimage.imageId==this.ImageId)
  {
    this.pixelData[i]= dicomPixelData;
  }
  else{
   this.pixelData[i]=this.pixelData[i]==null?newimage.getPixelData():this.pixelData[i];

  }
  
  this.maskArray[i] = await this._applyWatershedSegmentation(
    this.width,
    this.height,
    this.pixelData[i]
  );

}
    }else if(shouldErase===true){
      this.labelToErase=null;
      if(this.maskArray!=null)
      {
        for(let i=0;i<this.slicesNumber;i++)
        {
          if(i!=this.indexImage)
          {
            this._labelToErase(circleArray,this.maskArray[i],image);
          }
        }
    }
  }else if(shouldEraseManually===true){
    this._ManualEraser(circleArray,image)
  }

    // Draw / Erase the active color.
    let pixelMask3D=this._drawBrushPixels(
      this.maskArray,
      labelmap2D.pixelData,
      labelmap3D.labelmaps2D,this.slicesNumber
    );
    labelmap3D.labelmaps2D=pixelMask3D
    console.log(labelmap3D)
    external.cornerstone.updateImage(evt.detail.element);
  
  }
  /**
   * Applies Watershed segmentation algorithm on pixel data using opencv.js
   * and evaluates the mask to apply to the original dicom image
   *@name _ WatershedSegmentation
   * @protected
   * @param  {Mat} src The png matrix associated with the original pixel array
   * @param  {Array} dicomPixelData The pixelDataArray obtained with dicomimage.getPixeldata()
   * @returns {void}
   */
  _applyWatershedSegmentation(width, height, dicomPixelData) {
    let normalizedPixelData = new Uint8Array(width * height);
    for (let i = 0; i < dicomPixelData.length; i++) {
      normalizedPixelData[i] = this.mapToRange(
        dicomPixelData[i],
        this.minThreshold,
        this.maxThreshold
      );
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

    let lowerBinary = new cv.Mat();
    let upperBinary = new cv.Mat();

    cv.threshold(gray, lowerBinary, this.lowerThreshold, 255, cv.THRESH_BINARY);
    cv.threshold(
      gray,
      upperBinary,
      this.upperThreshold,
      255,
      cv.THRESH_BINARY_INV
    );

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


    
    let mask_array = [];
    let label=1;
    for (let i = 0; i < markers.rows; i++) {
      for (let j = 0; j < markers.cols; j++) {
        if (markers.intPtr(i, j)[0] == -1) {
          // Border pixel
          if (
            i === 0 ||
            j === 0 ||
            i === markers.rows - 1 ||
            j === markers.cols - 1
          ) {
            mask_array.push(0);
          } else {
            mask_array.push(label);
          }
        } else if (markers.intPtr(i, j)[0] > 1) {
          // Inside pixel (non-zero marker values)
         
          if(markers.intPtr(i, j)[0]>10)
          {
            label=10
          }
          else{label=markers.intPtr(i, j)[0]}
          mask_array.push(label)
          
        } else {
          // Background pixel (marker value == 0)
          mask_array.push(0);
        }
      }
    }
   

    // delete unused Mat elements
    src.delete();
    dst.delete();
    gray.delete();
    opening.delete();
    Bg.delete();
    Fg.delete();
    distTrans.delete();
    unknown.delete();
    markers.delete();
    M.delete();

    // mask array to mask a DICOM image
    return mask_array;
  }

/*function connectLabels(slice1, slice2) {
  // Assuming slice1 and slice2 are 2D arrays representing labels in each slice
  // Iterate through connected components in slice1
  for each component in getConnectedComponents(slice1) {
    // Find corresponding components in slice2 based on connectivity criteria
    let correspondingComponents = findCorrespondingComponents(component, slice1, slice2);

    // Assign the same label to corresponding components in slice2
    for each correspondingComponent in correspondingComponents {
      slice2[correspondingComponent.x][correspondingComponent.y] = component.label;
    }
  }
}

function findCorrespondingComponents(component, slice1, slice2) {
  // Implement logic to find components in slice2 that correspond to the given component in slice1
  // Use criteria such as proximity, size, shape, etc.
  // Return a list of corresponding components in slice2
}

// Iterate through slices and perform label propagation
for (let i = 1; i < numberOfSlices; i++) {
  connectLabels(slices[i - 1], slices[i]);
}*/
  /**
   * Draws the WS mask on the original imae
   *@name _drawBrushPixels
   * @protected
   * @param  {Array} masks //The mask array retrieved from WS algorithm
   * @param  {Array} pixelData //the original dicom image array
   * @param  {Array} segmentIndex //the index of the mask, in order to identify different features and change color (from 1 to n)
   *
   * @returns {void}
   */
  _drawBrushPixels(masks, pixelData2D,pixelData3D,slicesNumber) {
    
    for (let i = 0; i < masks[this.indexImage].length; i++) {
          pixelData2D[i] = masks[this.indexImage][i];
    }
    pixelData3D=new Array(slicesNumber)
    for(let j = 0; j < masks.length; j++)
    {
      let pixelData=masks[j]
      let segmentsOnLabelmap = Array.from(new Set(pixelData.filter(num => Number.isInteger(num)))).sort((a, b) => a - b);
      console.log(segmentsOnLabelmap)
      pixelData3D[j]={
        pixelData,
        segmentsOnLabelmap
      }
    }
    return pixelData3D
  }

  /**
   * Allows to erase selected label parts (evaluating the label that appears the most in the selected area) when using cntrl+click 
   *@name _labelToErase
   * @protected
   * @param  {Array} circleArray //The selected circle coordinates Array
   * @param  {Array} maskArray //the mask array of the last WS segmentation
   * @param  {Image} image //the dicom image
   *
   * @returns {void}
   */
_labelToErase(circleArray,maskArray,image)
{
  if(this.labelToErase==null){
  let counts=new Array(11).fill(0);
  circleArray.forEach(([x, y]) => {
    const label= this.maskArray[this.indexImage][y * image.rows + x];
    counts[label]=counts[label]+1;
  });
  console.log(counts)
  let max=this.getMax(counts)
  this.labelToErase=counts.findIndex(count => count === max);
  for(let i=0;i<maskArray.length;i++)
  {
    this.maskArray[this.indexImage][i]=this.maskArray[this.indexImage][i]===this.labelToErase ? 0:this.maskArray[this.indexImage][i];
  }}

  for(let i=0;i<maskArray.length;i++)
  {
    
    maskArray[i]=maskArray[i]===this.labelToErase ? 0:maskArray[i];
  }
  
}
_ManualEraser(circleArray,image)
{
  
  circleArray.forEach(([x, y]) => {
    this.maskArray[this.indexImage][y * image.rows + x]=0;
  });
  
}
 /**
   * Allows to calculate stats such as mean and stddev of the selected circle area
   *@name _labelToErase
   * @protected
   * @param  {Image} image //the dicom image
   * @param  {Array} imagePixelData 
   * @param  {Array} circleArray //The selected circle coordinates Array
   * 
   * @returns {void}
   */
  _calculateStats(image, imagePixelData, circleArray) {
    let sum = 0;
    let sumSquaredDiff = 0;

    circleArray.forEach(([x, y]) => {
      const value = imagePixelData[y * image.rows + x];

      sum += value;
      sumSquaredDiff += value * value;
    });

    const count = circleArray.length;

    const mean = sum / count;
    console.log("count", count);
    const variance = sumSquaredDiff / count - mean * mean;
    const stddev = Math.sqrt(variance);
    console.log("MEAN", mean);
    console.log("STDDEV", stddev);
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
