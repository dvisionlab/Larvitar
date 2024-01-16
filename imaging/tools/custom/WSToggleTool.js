/*
*/
//watershed segmentation is useful to segment features with distinguishable greyscale values that are
//difficult to distinguish between them, in order to extract quantitative information
//(see example here https://www.geeksforgeeks.org/image-segmentation-with-watershed-algorithm-opencv-python/)

// external libraries
import cornerstoneTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";
import { each, extend} from "lodash";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");
const getToolState = cornerstoneTools.getToolState;
// internal libraries
import { DEFAULT_TOOLS } from "../default";
import store from "../../imageStore";
const setSegmentationConfig = function (config) {
  let { configuration } = cornerstoneTools.getModule("segmentation");
  extend(configuration, config);
  let enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};
/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "WSToggle",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        multiImage: false,
        startIndex:null,
        endIndex:null,
        masksNumber:10
      },
      mixins: ["renderBrushMixin"]
    };

    super(props, defaultProps);
    this.lowerThreshold = null;
    this.upperThreshold = null;
    this.maskArray = null;
    this.maskArrayCurrentImage=null;
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
    this.click=0;
    this.labelToChange=null;
    //this.touchDragCallback = this._paint.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    document.addEventListener('mousemove', this._handleMouseMove);
    setSegmentationConfig({segmentsPerLabelmap:this.configuration.masksNumber})
    //const { configuration } = segmentationModule;
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
    if(evt.ctrlKey == true||evt.altKey==true||evt.shiftKey==true)
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
 mouseDragCallback(evt) {
  const { currentPoints } = evt.detail;

    this._lastImageCoords = currentPoints.image;
  if (evt.detail.buttons === 1&&evt.detail.shiftKey) {
   
    this._paint(evt);
    
}
}

handleToggle(isMultiImage,startIndex,endIndex,masksNumber) {
    // Toggle mode between 'stack' and 'slice' on Tab key press or other events
   
    this.configuration.multiImage=isMultiImage;
    if(isMultiImage===true)
    {
        this.configuration.startIndex=startIndex===null?0:startIndex
        this.configuration.endIndex=endIndex===null?this.slicesNumber:endIndex
    }
    else{
        this.configuration.startIndex=null
        this.configuration.endIndex=null
    }

    this.configuration.masksNumber=masksNumber===undefined|null?10:masksNumber
  }
  /**
   * Paints the data to the labelmap.
   *@name _paint
   * @protected
   * @param  {ClickEvent} evt The data object associated with the event.
   * @returns {void}
   */
  async _paint(evt) {
    //TODO: ADD LABEL PICKER + BRUSH MANUAL PAINT WITH THAT LABEL 
    
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
      this._resetData(viewport.seriesUID,stackData);
    }
    //this.seriesId=store.get(["viewports", this.element.id]).seriesUID;
    this.imageId=image.imageId;
    this.indexImage = stackData.imageIds.indexOf(this.imageId);
  
    this.slicesNumber=this.slicesNumber||stackData.imageIds.length;
    this.seriesUID=viewport.seriesUID;
    const { rows, columns } = image;
    this.width = this.height || image.height;
    this.height = this.width || image.width;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    let shouldEraseManually=evt.detail.shiftKey===undefined?evt.detail.event.shiftKey:evt.detail.shiftKey
    let shouldActivateManualPainter=evt.detail.event===undefined?undefined:evt.detail.event.altKey
 
    
    let circleArray = getCircle(radius, rows, columns, x, y);
    this.handleToggle(
        DEFAULT_TOOLS["WSToggle"].configuration.multiImage, DEFAULT_TOOLS["WSToggle"].configuration.startIndex,DEFAULT_TOOLS["WSToggle"].configuration.endIndex,DEFAULT_TOOLS["WSToggle"].configuration.masksNumber
      );
      const isMultiImage = this.configuration.multiImage;

    if ((shouldErase===false||shouldErase===undefined)&&(shouldEraseManually===false||shouldEraseManually===undefined)&&(shouldActivateManualPainter===false||shouldActivateManualPainter===undefined)){
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

let xFactor = 1.7;
this.xFactor=xFactor;
this.lowerThreshold = meanNorm - xFactor * stdDevNorm;
this.upperThreshold = meanNorm + xFactor * stdDevNorm;

if(isMultiImage===false)
{
  this.maskArrayCurrentImage=new Array(this.width*this.height)
    await this._applyWatershedSegmentation(this.width,
        this.height,
        dicomPixelData)
      .then(result=> {this.maskArrayCurrentImage=result})
      labelmap2D.pixelData=this.maskArrayCurrentImage
      external.cornerstone.updateImage(evt.detail.element)
}
else if(isMultiImage===true){
this.maskArray=new Array(this.slicesNumber)
this.pixelData=new Array(this.slicesNumber)
//this.toggleUIVisibility(false, true);
for(let i=this.configuration.startIndex;i<this.configuration.endIndex;i++)
{
  let newimage= cornerstone.imageCache.cachedImages[i].image
  if(newimage.imageId==this.ImageId)
  {
    this.pixelData[i]= dicomPixelData;
  }
  else{
   
   this.pixelData[i]=this.pixelData[i]==null?newimage.getPixelData():this.pixelData[i];
  
  }
   await this._applyWatershedSegmentation(this.width,
    this.height,
    this.pixelData[i])
  .then(result=> {this.maskArray[i] =result})
 
}

//labelmap2D.pixelData=this.maskArray[this.indexImage].slice();
let pixelMask3D=this._drawBrushPixels(
    this.maskArray,
    labelmap3D.labelmaps2D
  );
  labelmap3D.labelmaps2D=pixelMask3D
  external.cornerstone.updateImage(evt.detail.element)
}
//this.toggleUIVisibility(true, false)
    }else if(shouldErase===true){
      this.labelToErase=null;
      if(isMultiImage===false)
      {
        if(this.maskArrayCurrentImage!=null)
        {
          this._labelToErase(circleArray,this.maskArrayCurrentImage,image,this.maskArrayCurrentImage);
          labelmap2D.pixelData=this.maskArrayCurrentImage
          external.cornerstone.updateImage(evt.detail.element)
        }
     
      }
      else if(isMultiImage===true)
      {
        if(this.maskArrayCurrentImage!=null&&this.maskArray===null)
        {
          //this.maskArray=new Array(this.slicesNumber)
          //this.maskArray[this.indexImage]=this.maskArrayCurrentImage
          this._labelToErase(circleArray,this.maskArrayCurrentImage,image,this.maskArrayCurrentImage);
          labelmap2D.pixelData=this.maskArrayCurrentImage
          external.cornerstone.updateImage(evt.detail.element)
        } else if(this.maskArray!=null)
      {
        
        for(let i=0;i<this.slicesNumber;i++)
        {
          //if(i!=this.indexImage)
          //{
            this._labelToErase(circleArray,this.maskArray[this.indexImage],image,this.maskArray[i]);
          //}
        }
        let pixelMask3D=this._drawBrushPixels(
          this.maskArray,
          labelmap3D.labelmaps2D
        );
        labelmap3D.labelmaps2D=pixelMask3D
        external.cornerstone.updateImage(evt.detail.element)
    }
    
}
  }else if(shouldEraseManually===true){

    let inputEraserArray=isMultiImage?((this.maskArrayCurrentImage!=null&&this.maskArray===null)?this.maskArrayCurrentImage:this.maskArray[this.indexImage]):this.maskArrayCurrentImage
    
    this._ManualEraser(circleArray,image,inputEraserArray)
    labelmap2D.pixelData=inputEraserArray
   if(isMultiImage&&this.maskArray!=null){
    let pixelMask3D=this._drawBrushPixels(
      this.maskArray,
      labelmap3D.labelmaps2D
    );
    labelmap3D.labelmaps2D=pixelMask3D
    
    }
    external.cornerstone.updateImage(evt.detail.element)
  }else if(shouldActivateManualPainter===true){
    

    this.click = this.click + 1;

    let currentArray=isMultiImage?((this.maskArrayCurrentImage!=null&&this.maskArray===null)?this.maskArrayCurrentImage:this.maskArray[this.indexImage]):this.maskArrayCurrentImage
    
if (this.click === 1) {
  this._labelPicker(circleArray, image, currentArray);
  console.log("color picked");
} else if (this.click === 2) {
  this._ManualPainter(circleArray, image, currentArray);
  this.click = 0;
}
labelmap2D.pixelData = currentArray;
if(isMultiImage&&this.maskArray!=null)
{
  let pixelMask3D=this._drawBrushPixels(
    this.maskArray,
    labelmap3D.labelmaps2D
  );
  labelmap3D.labelmaps2D=pixelMask3D
  
}
external.cornerstone.updateImage(evt.detail.element)
  }

  /*let pixelMask3D=this._drawBrushPixels(
    this.maskArray,
    labelmap2D.pixelData,
    labelmap3D.labelmaps2D
  );
  labelmap3D.labelmaps2D=pixelMask3D
  external.cornerstone.updateImage(evt.detail.element)*/
  }

 /**
   * resets data when imaegId or seriesUID changes
   *@name _resetData
   * @protected
   * @param  {string} seriesUID
   * @returns {void}
   */
_resetData(seriesUID,stackData){
  this.dicomPixelData = null;
  this.minThreshold = null;
  this.maxThreshold = null;
  this.segmentIndex=1;
  this.pixelData=(this.seriesUID != seriesUID)?null:this.pixelData
  this.slicesNumber=(this.seriesUID != seriesUID)?null:stackData.imageIds.length
  this.maskArray=(this.seriesUID != seriesUID)?null:this.maskArray;
  this.maskArrayCurrentImage=null;
}
  /**
   * Activates a loader in progress when WS is advancing
   *@name _toggleUIVisibility
   * @protected
   * @param  {boolean} showBrush 
   * @param  {boolean} showLoader 
   * @returns {void}
   */
   _toggleUIVisibility(showBrush, showLoader) {
    
    this.configuration.drawHandlesOnHover = showBrush;
    document.getElementById('loading-bar-container').style.display = showLoader ? 'block' : 'none';
  }

  /**
   * eliminates the label that appear less than minappearance
   *@name _shiftAndZeroOut
   * @protected
   * @param  {Mat} array The marker array
   * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
   * @returns {void}
   */
  _shiftAndZeroOut(array, minAppearance) {
    const shiftMap = {};
let shiftValue = 0;

const shiftedArray = array.map((num, index) => {
  const count = (shiftMap[num] = (shiftMap[num] || 0) + 1);
  return count >= minAppearance ? shiftValue++ : -1;
});
  
    return shiftedArray;
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
    return new Promise((resolve, reject) => {
      try {
        // Assuming 8-bit unsigned integer pixel values
        // Create a new array for PNG pixel data with 4 channels: RGB
        const pngPixelData = new Uint8Array(width * height * 4);
 
    for (let i = 0; i < dicomPixelData.length; i++) {
      // Assuming each integer represents a grayscale value
      pngPixelData[i * 4] = this.mapToRange(
        dicomPixelData[i],
        this.minThreshold,
        this.maxThreshold
      ) // Red channel
      pngPixelData[i * 4 + 1] = pngPixelData[i * 4]; // Green channel
      pngPixelData[i * 4 + 2] = pngPixelData[i * 4]; // Blue channel
      pngPixelData[i * 4 + 3] = 255; // Alpha channel (fully opaque)
    }
 
   
    
    // Create an OpenCV Mat object from the PNG pixel data
    let src = new cv.Mat(height, width, cv.CV_8UC4); // 3 channels: RGB
    src.data.set(pngPixelData);

    
    let gray = new cv.Mat();
    // Detect contours on the original DICOM image
    //let contours = new cv.MatVector();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    /* Assuming your OpenCV.js version uses these constants
    let hierarchy = new cv.Mat();  
    cv.findContours(gray, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    // Create an array of contours 
    let contourArray = new Array(gray.rows * gray.cols).fill(0);

    for (let i = 0; i < contours.size(); i++) {
      let currentContour = contours.get(i);
  
      // Loop through the matrix to extract coordinates and values
      for (let row = 0; row < currentContour.rows; row++) {
          for (let col = 0; col < currentContour.cols; col++) {
              // Get the pixel value at (row, col) in the current Mat
              // Check if the pixel is on the contour
            let isOnContour = cv.pointPolygonTest(currentContour, { x: col, y: row }, true) === 0;
          
            // Set the corresponding value in contourArray
            contourArray[row * gray.cols + col] = isOnContour ? 1 : 0;
          }
      }
  
      // Release the current Mat object
      currentContour.delete();
  }
    
    // clean up
    contours.delete();
    hierarchy.delete();*/

    let opening = new cv.Mat();
    let Bg = new cv.Mat();
    let Fg = new cv.Mat();
    let distTrans = new cv.Mat();
    let unknown = new cv.Mat();
    let markers = new cv.Mat();
    //gray and threshold image
    
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
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
    cv.threshold(distTrans, Fg, 0, 255, cv.THRESH_BINARY);
    Fg.convertTo(Fg, cv.CV_8U, 1, 0);
    cv.subtract(Bg, Fg, unknown);
    // get connected components markers
    cv.connectedComponents(Fg, markers);
    
    
    let markersArray=new Array(markers.rows*markers.cols)
    for (let i = 0; i < markers.rows; i++) {
      for (let j = 0; j < markers.cols; j++) {
        const markerValue = markers.ucharPtr(i, j)[0] + 1;
        markers.intPtr(i, j)[0] = (unknown.ucharPtr(i, j)[0] === 255) ? 0 : markerValue;
        markersArray[markers.cols * i + j - 1] = markers.intPtr(i, j)[0];
      }
    }
  
    
  
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    cv.watershed(src, markers);
    //this._postProcess(markers)
    
    this._shiftAndZeroOut(markersArray, 100);

    let label = 1;
    const rows = markers.rows;
    const cols = markers.cols;
    const lastRowIndex=rows-1;
    const lastColIndex=cols-1;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const markersArrayIndex = i * markers.cols + j;
        const markerValue = markers.intPtr(i, j)[0];
    
        if (markerValue === -1) {
          // Border pixel
          markersArray[markersArrayIndex] = (i === 0 || j === 0 || i === lastRowIndex || j === lastColIndex) ? 0 : label;
        } else if (markerValue >= 1) {
          // Inside pixel (non-zero marker values)
          label = (markerValue > this.configuration.masksNumber) ? this.configuration.masksNumber : markerValue;
          markersArray[markersArrayIndex] = label;
        } else {
          // Background pixel (marker value == 0)
          markersArray[markersArrayIndex] = 0;
        }
        /*if(contourArray[markersArrayIndex]===1)
        {
          console.log("contour")
          markersArray[markersArrayIndex] = 1;
        }*/
      }
    }
    
    //this._processAsync(10, markers, markersArray, label);
      
        // delete unused Mat elements
        src.delete();
        gray.delete();
        opening.delete();
        Bg.delete();
        Fg.delete();
        distTrans.delete();
        unknown.delete();
        markers.delete();
        M.delete();
        // mask array to mask a DICOM image
        resolve(markersArray);
 
  } catch (error) {
    reject(error);
  }
});
}

  /**
   *
    *@name _processChunk
   * @protected
   * @param  {number} i 
   * @param  {number} j 
   * @param  {number} markers//the markers,found and processed after WS
   * @param  {Array} markersArray //the array of markers processed 
   * @param  {number} label //the label of the initial feature 1 
   * @param  {number}lastRowIndex //rows-1
   * @param  {number}lastColIndex //cols-1
   * 
   * 
   * 
   * @returns {void}
   */
   _processChunk(i, j, markers, markersArray, label, lastRowIndex, lastColIndex) {
    const markersArrayIndex = i * markers.cols + j;
    const markerValue = markers.intPtr(i, j)[0];
  
    if (markerValue === -1) {
      // Border pixel
      markersArray[markersArrayIndex] = (i === 0 || j === 0 || i === lastRowIndex || j === lastColIndex) ? 0 : label;
    } else if (markerValue >= 1) {
      // Inside pixel (non-zero marker values)
      label = (markerValue > 10) ? 10 : markerValue;
      markersArray[markersArrayIndex] = label;
    } else {
      // Background pixel (marker value == 0)
      markersArray[markersArrayIndex] = 0;
    }
  }
  /**
   * 
   *@name _processRowsAsync
   * @protected
   * @param  {number} startRow //the markers rows found and processed after WS
   * @param  {number} endRow //the markers rows found and processed after WS
   * @param  {number} markers//the markers,found and processed after WS
   * @param  {Array} markersArray //the array of markers processed 
   * @param  {number} label //the label of the initial feature 1 
   * @param  {number}lastRowIndex //rows-1
   * @param  {number}lastColIndex //cols-1
   * 
   * @returns {void}
   */
   _processRowsAsync(startRow, endRow, markers, markersArray, label, lastRowIndex, lastColIndex) {
    for (let i = startRow; i < endRow; i++) {
      for (let j = 0; j < markers.cols; j++) {
        this._processChunk(i, j, markers, markersArray, label, lastRowIndex, lastColIndex);
      }
    }
  }
  
  /**
   * 
   *@name _processAsync
   * @protected
   * @param  {Array} rowsPerChunk //deafult rows to be processed per chunk (10)
   * @param  {number} markers//the markers,found and processed after WS
   * @param  {Array} markersArray //the array of markers processed 
   * @param  {number} label //the label of the initial feature 1 
   * 
   * @returns {void}
   */
   _processAsync(rowsPerChunk, markers, markersArray, label) {
    let currentRow = 0;
    const rows = markers.rows;
    const cols = markers.cols;
    const lastRowIndex=rows-1;
    const lastColIndex=cols-1;
    const processChunkAsync = () => {
      const endRow = Math.min(currentRow + rowsPerChunk, markers.rows);
      this._processRowsAsync(currentRow, endRow, markers, markersArray, label, lastRowIndex, lastColIndex);
      currentRow = endRow;
  
      if (currentRow < markers.rows) {
        // Schedule the next chunk
        setTimeout(processChunkAsync, 0);
      } else {
        // All rows processed, resolve or do any further processing
        resolve(markersArray);
      }
    };
  
    processChunkAsync();
  }
  
  /**
   * Post processes the markers after WS //TODO check errors in drawContours
   *@name _postProcess
   * @protected
   * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
   * @returns {cv.Mat}
   */
 _postProcess(markers) {
  console.log('Code is executing!');
    try {
      console.log('Code is trying!');
      // Apply morphological operations to fill gaps and smooth boundaries
      let kernel = cv.Mat.ones(5, 5, cv.CV_8U);
      markers.convertTo(markers, cv.CV_8U);
      console.log('Code is still trying!');
      cv.morphologyEx(markers, markers, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);
      
      // Find contours in the markers
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(markers, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  
      // Filter contours based on area (adjust the threshold as needed)
      let minContourArea = 100;
      let filteredContours = [];
      for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
  
        // Log the area of each contour
  
        if (area > minContourArea) {
          filteredContours.push(contour);
        }
      }
      let matVector = new cv.MatVector();
      for (let i = 0; i < filteredContours.length; i++) {
        matVector.push_back(filteredContours[i]);
      }
      // Create a new mask for the filtered contours
      let postProcessedMarkers = cv.Mat.zeros(markers.rows, markers.cols, cv.CV_8U);
      
      cv.drawContours(postProcessedMarkers, matVector, -1, new cv.Scalar(255), cv.FILLED);
  
      // Release Mats to free memory
      kernel.delete();
      contours.delete();
      hierarchy.delete();
  
      return postProcessedMarkers;
    } catch (error) {
      console.error("Error in postProcess:", error);
      throw error; // Rethrow the error to propagate it further if needed
    }
  }
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
  _drawBrushPixels(masks,pixelData3D) {
    pixelData3D = masks.map(pixelData => {
        const segmentsOnLabelmap = [...new Set(pixelData.filter(Number.isInteger))].sort((a, b) => a - b);
        return { pixelData, segmentsOnLabelmap };
      });
      
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
_labelToErase(circleArray,selectedSlice,image,slicei)
{
  if(this.labelToErase==null){
  let counts=new Array(this.configuration.masksNumber).fill(0);
  circleArray.forEach(([x, y]) => {
    const label= selectedSlice[y * image.rows + x];
    counts[label]=counts[label]+1;
  });

  let max=this.getMax(counts)
  this.labelToErase=counts.findIndex(count => count === max);
  /*for(let i=0;i<selectedSlice.length;i++)
  {
    selectedSlice[i]=selectedSlice[i]===this.labelToErase ? 0:selectedSlice[i];
  }*/}

  for(let i=0;i<slicei.length;i++)
  {
    
    slicei[i]=slicei[i]===this.labelToErase ? 0:slicei[i];
  }

}
 /**
   * Allows to erase selected label parts when using shift+click (allows to drag)
   *@name _ManualEraser
   * @protected
   * @param  {Array} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   *
   * @returns {void}
   */

_ManualEraser(circleArray,image,array)
{

  circleArray.forEach(([x, y]) => {
    array[y * image.rows + x]=0;
  });
  
  
}
/**
   * Allows to pick a selected label parts when using alt+click for the first time
   *@name _labelPicker
   * @protected
   * @param  {Array} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   *
   * @returns {void}
   */

_labelPicker(circleArray,image,currentArray){
  let counts=new Array(this.configuration.masksNumber+1).fill(0);
  circleArray.forEach(([x, y]) => {
    const label= currentArray[y * image.rows + x];
    counts[label]=counts[label]+1;
  });

  let max=this.getMax(counts)
  this.pickedLabel=counts.findIndex(count => count === max);
}
/**
   * Allows to associate the previously picked label on the selected label area when using alt+click for the second time
   *@name _ManualPainter
   * @protected
   * @param  {Array} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   *
   * @returns {void}
   */
_ManualPainter(circleArray,image,array){

    let counts=new Array(this.configuration.masksNumber+1).fill(0);
    circleArray.forEach(([x, y]) => {
      const label= array[y * image.rows + x];
      counts[label]=counts[label]+1;
    });
  
    let max=this.getMax(counts)
    this.labelToChange=counts.findIndex(count => count === max);

    for(let i=0;i<array.length;i++)
    {
      if(array[i]===this.labelToChange)
      {
        array[i]=this.pickedLabel
      }
    }
  
  
}
 /**
   * Allows to calculate stats such as mean and stddev of the selected circle area
   *@name  _calculateStats
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
    const variance = sumSquaredDiff / count - mean * mean;
    const stddev = Math.sqrt(variance);
    return { mean, stddev };
  }
   /**
   * Allows to map a value to range 0,255 (8bit, png)
   *@name  mapToRange
   * @protected
   * @param  {number} value //the greyscale value to convert
   * @param  {number} inMin//The min gs value in the image
   * @param  {number} inMax //The max gs value in the image
   * 
   * @returns {void}
   */
  mapToRange(value, inMin, inMax) {
    return ((value - inMin) / (inMax - inMin)) * 255;
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

}


//eventually TODO:

//1)TEST CONNECTED COMPONENTS 


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


//2) TEST FUZZY C-MEAN CLUSTERING 


/*
https://www.semanticscholar.org/paper/MEDICAL-IMAGE-SEGMENTATION-USING-FUZZY-C-MEANS-AND-Christ-Parvathi/319e203d1994319ba7979a65ded8bb1d55a9c889 
https://docs.opencv.org/3.4/d1/d5c/tutorial_py_kmeans_opencv.html

*/

/*
    let imgInput, imgGray, imgFuzzyOutput;

    function onOpenCvReady() {
      loadImage();
    }

    function loadImage() {
      const fileInput = document.getElementById('fileInput');
      const canvasInput = document.getElementById('canvasInput');
      const ctxInput = canvasInput.getContext('2d');

      const img = new Image();
      img.src = URL.createObjectURL(fileInput.files[0]);
      img.onload = function() {
        canvasInput.width = img.width;
        canvasInput.height = img.height;
        ctxInput.drawImage(img, 0, 0);
        performFuzzyCMeans();
      };
    }

    function performFuzzyCMeans() {
      const canvasInput = document.getElementById('canvasInput');
      const ctxInput = canvasInput.getContext('2d');

      const src = cv.imread(canvasInput);

      // Convert to grayscale
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Convert to float32
      const data = new cv.Mat();
      gray.convertTo(data, cv.CV_32F);

      // Reshape to a single column
      data = data.reshape(1, gray.rows * gray.cols);

      // Set the number of clusters (adjust as needed)
      const k = 3;

      // Term criteria for the algorithm
      const termCriteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER, 100, 0.2);

      // Apply Fuzzy C-means clustering
      const labels = new cv.Mat();
      const centers = new cv.Mat();
      cv.kmeans(data, k, labels, termCriteria, 1, cv.KMEANS_RANDOM_CENTERS, centers);

      // Reshape the labels to the original image size
      labels = labels.reshape(1, gray.rows);

      // Create a color map for visualization
      const colormap = new cv.Mat();
      cv.applyColorMap(labels, colormap, cv.COLORMAP_JET);

      // Display the result
      const canvasOutput = document.getElementById('canvasOutput');
      const ctxOutput = canvasOutput.getContext('2d');
      cv.imshow(canvasOutput, colormap);

      // Clean up
      src.delete();
      gray.delete();
      data.delete();
      termCriteria.delete();
      labels.delete();
      centers.delete();
      colormap.delete();
    }
*/

//3)POST-PROCESSING: Merge labels that appear only a few times, connect labels 
/* function shiftAndZeroOut(array, minAppearance) {
  // Count the occurrences of each integer
  const countMap = array.reduce((acc, num) => {
    acc[num] = (acc[num] || 0) + 1;
    return acc;
  }, {});

  // Create a mapping for shifting
  const shiftMap = {};
  let shiftValue = 0;
  
  for (const num in countMap) {
    if (countMap[num] >= minAppearance) {
      shiftMap[num] = shiftValue++;
    } else {
      shiftMap[num] = -1; // Mark for zeroing out
    }
  }

  // Update the array with shifted values and zeros
  const shiftedArray = array.map(num => (shiftMap[num] !== undefined) ? shiftMap[num] : num);

  return shiftedArray;
}
*/

//4)CREARE LABELS ad hoc per segmentare più di 10 features 

//5)BG REMOVAL (tornare a versioni precedenti (solo label 1 )
/* if (
            i === 0 ||
            j === 0 ||
            i === markers.rows - 1 ||
            j === markers.cols - 1
          ) {
            mask_array.push(0);
          }
          else {
            mask_array.push(1);
          }


        } else if (markers.intPtr(i, j)[0] > 1) {
          // Inside pixel (non-zero marker values)
          mask_array.push(1);*/


//+TRY SPEEDING UP THE CODE WITH WEBWORKERS
//+CLEAN THE CODE 