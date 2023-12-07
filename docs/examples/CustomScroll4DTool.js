/*In 'stack' mode: when you scroll using the mouse wheel, 
it will scroll through different slices while keeping the frame constant. 
This means you are navigating through the same frame but different slices in the stack.

In 'slice' mode: when you scroll using the mouse wheel,
 it will scroll through different frames of a single slice. 
 This means you are navigating through different frames of the same slice in the stack.
*/

const cornerstoneTools = larvitar.cornerstoneTools;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const scroll = cornerstoneTools.importInternal("util/scroll");
const scrollToIndex = cornerstoneTools.importInternal("util/scrollToIndex");
const getToolState = cornerstoneTools.getToolState;

class CustomScrollTool4D extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "CustomScrollTool4D",
      supportedInteractionTypes: ["MouseWheel", "Key"],
      configuration: {
        loop: false,
        allowSkipping: true,
        invert: false,
        fixedFrame: 1,
        fixedSlice: 0,
        currentMode: "stack", // 'stack' or 'slice'
        framesNumber: 1
      }
    };

    super(props, defaultProps);
    console.log("ELEMENT", this.element);
    this.currentMode = "stack";
    this.framesNumber = this.configuration.framesNumber;
    this.slicesnumber;
    this.arraytimestamps = [];
    this.imagetime = document.getElementById("image-time");
    this.timestamp = document.getElementById("timestamp");
    this.slicenum = document.getElementById("slicenum");
    this.is4D = false;
    this.isMultiframe = false;
    if (
      this.imagetime != undefined &&
      this.timestamp != undefined &&
      this.slicenum != undefined
    ) {
    this.imagetime.innerText =
      "Press B or b to switch between stack/slice mode ";
    this.timestamp.innerText = "Standard acquisitions: only stack mode ";
    this.slicenum.innerText = "Multiframe acquisitions: scrolling slice mode";}
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    //console.log(larvitar.store.get("series"))
  }

  Verify4D() {
    const enabledElement = larvitar.cornerstone.getEnabledElement(this.element);
    const imageId = enabledElement.image.imageId;
    let Getter = larvitar.cornerstone.metaData.get(
      "generalSeriesModule",
      imageId
    );
    let seriesId;
    if (Getter === undefined) {
      //->it is a multiframe image
      let parsedImageId =
        larvitar.cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);
      console.log(parsedImageId);
      let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      console.log(rootImageId);
      let imageTracker = larvitar.getLarvitarImageTracker();
      console.log(imageTracker);
      seriesId = imageTracker[rootImageId];
    } else {
      seriesId = Getter.seriesInstanceUID; //TODO DOES NOT WORK FOR MULTIFRAME, WHY?
    }

    console.log(seriesId);
    //let seriesId = String(Object.keys(larvitar.store.get("series"))[0]);
    let manager = larvitar.getLarvitarManager();
    console.log(manager);
    let Serie = manager[seriesId];
    console.log(Serie);
    let imageIds = Serie.imageIds;
    let instance = Serie.instances[imageIds[0]];
    let metadata = instance.metadata;
    let frames_number_mod1 = metadata.x00280008;
    let is4D = metadata.is4D;
    console.log(metadata);
    let isMultiframe = metadata.isMultiframe;
    console.log(isMultiframe);
    let frames_number_mod2 = metadata["numberOfTemporalPositions"];
    // console.log(frames_number_mod2);
    let frames_number = 0;
    if (is4D === true) {
      this.is4D = true;
      this.isMultiframe = false;
      if (frames_number_mod1 != undefined) {
        frames_number = frames_number_mod1;
        this.arraytimestamps =
          larvitar.store.get("viewports").viewer.timestamps;
      } else if (frames_number_mod2 != undefined) {
        frames_number = frames_number_mod2;
        this.arraytimestamps =
          larvitar.store.get("viewports").viewer.timestamps;
      }
    } else if (isMultiframe === true) {
      this.is4D = false;
      this.isMultiframe = true;
      frames_number = Serie.numberOfFrames;
    } else {
      frames_number = 1;
      this.is4D = false;
      this.isMultiframe = false;
    }
    this.configuration.framesNumber = frames_number;
    this.framesNumber = this.configuration.framesNumber;
    return is4D;
  }
  handleKeyDown(event) {
    // Toggle mode between 'stack' and 'slice' on Tab key press

    if (event.key === "b" || event.key === "B") {
      this.Verify4D();
      if (this.is4D === false) {
        if (this.isMultiframe === true) {
          this.currentMode = "slice";
          this.configuration.currentMode = "slice";
        } else {
          this.currentMode = "stack";
          this.configuration.currentMode = "stack";
        }

        return;
      } else if (this.is4D === true) {
        this.framesNumber = this.configuration.framesNumber;
        const element = this.element; // Get the tool's element
        if (element) {
          // console.log(this.framesNumber);
          this.toggleMode(element); // Pass the element to toggleMode
          // console.log(this.currentMode);
        }
      }
    }
  }

  toggleMode(element) {
    if (
      this.currentMode === "stack" &&
      this.configuration.framesNumber != undefined &&
      this.framesNumber != null &&
      this.framesNumber > 0
    ) {
      //change from stack to slice, but only if number of frames is >0
      const { currentMode, fixedFrame, fixedSlice } = this.configuration;

      if (!element) {
        console.error("Element is undefined");
        return;
      }

      const toolData = getToolState(element, "stack");
      if (!toolData || !toolData.data || !toolData.data.length) {
        return;
      }

      const stackData = toolData.data[0];
      const currentIndex = stackData.currentImageIdIndex;
      // console.log(currentIndex);
      // Switching from 'stack' to 'slice'
      this.configuration.fixedFrame = fixedFrame;
      this.configuration.fixedSlice = Math.floor(
        (currentIndex + 1) / this.framesNumber
      ); //so that slice=0,1, 2 , 3 etc
      this.configuration.currentMode = "slice";
      this.currentMode = "slice";
      //this.configuration.currentMode = this.currentMode === 'stack' ? 'slice' : 'stack';
    } else if (
      this.currentMode === "stack" &&
      (this.framesNumber <= 0 ||
        this.framesNumber === undefined ||
        this.framesNumber === null)
    ) {
      //doesn't change from stack to slice, because number of frames is <0
      // console.log("FRAMES NUMBER IS NOT >0");
    } else if (this.currentMode === "slice") {
      // console.log("from slice to stack");
      //changes from slice to stack
      const { currentMode, fixedFrame, fixedSlice } = this.configuration;

      if (!element) {
        console.error("Element is undefined");
        return;
      }

      const toolData = getToolState(element, "stack");
      if (!toolData || !toolData.data || !toolData.data.length) {
        // console.log("tooldata undefined");
        return;
      }

      const stackData = toolData.data[0];
      const currentIndex = stackData.currentImageIdIndex;
      // console.log(currentIndex);
      // Switching from 'slice' to 'stack'
      this.configuration.fixedSlice = fixedSlice;
      this.configuration.fixedFrame =
        currentIndex + 1 - fixedSlice * this.framesNumber; //so that frame is related to the current slice
      // console.log(fixedFrame);
      this.configuration.currentMode = "stack";
      this.currentMode = "stack";

      //this.configuration.currentMode = this.currentMode === 'stack' ? 'slice' : 'stack';
    }
  }

  mouseWheelCallback(evt) {
    const { direction: images, element } = evt.detail;

    console.log(images);
    console.log(element);

    this.Verify4D();
    if (this.is4D === false) {
      if (this.isMultiframe === true) {
        this.currentMode = "slice";
        this.configuration.currentMode = "slice";
      } else {
        this.currentMode = "stack";
        this.configuration.currentMode = "stack";
      }
    }
    console.log(this.currentMode);
    const {
      loop,
      allowSkipping,
      invert,
      fixedFrame,
      fixedSlice,
      currentMode,
      framesNumber
    } = this.configuration;

    const direction = invert
      ? images * (currentMode === "stack" ? framesNumber : 1)
      : images * (currentMode === "stack" ? framesNumber : 1);
    console.log("DIRECTION: ", direction);
    if (currentMode === "stack") {
      // Handle 'stack' mode
      const toolData = getToolState(element, "stack");
      if (!toolData || !toolData.data || !toolData.data.length) {
        return;
      }

      const stackData = toolData.data[0];

      // Calculate validIndex for 'stack' mode (no looping) between 0 and (N-1)*framesnumber where N=numberofslices=numberofimageids/numberofframes
      console.log(stackData.currentImageIdIndex);
      console.log(direction);
      let oldImageIdIndex = stackData.currentImageIdIndex;
      let newImageIdIndex = stackData.currentImageIdIndex + direction;
      if (stackData.currentImageIdIndex === -1) {
        newImageIdIndex = 0 + direction;
        oldImageIdIndex = 0;
      }

      console.log(stackData.currentImageIdIndex);
      console.log(newImageIdIndex);
      const numberOfSlices =
        Math.ceil(stackData.imageIds.length / this.framesNumber) - 1; // Your total number of slices
      this.slicesnumber = numberOfSlices; //actual numberofslices-1
      let validIndex;
      console.log(stackData.imageIds.length - 1);
      // Ensure validIndex is between 0 and upperBound
      if (
        newImageIdIndex >= 0 &&
        newImageIdIndex < stackData.imageIds.length - 1
      ) {
        validIndex = newImageIdIndex;
      } else if (newImageIdIndex < 0 || numberOfSlices === 0) {
        validIndex = oldImageIdIndex;
      } else if (newImageIdIndex >= stackData.imageIds.length - 1) {
        validIndex = oldImageIdIndex;
      }

      console.log(validIndex);
      // Scroll to the calculated index
      scrollToIndex(element, validIndex);
      let currentframe = fixedFrame;
      let myslice = Math.floor(validIndex / this.framesNumber) + 1;
      let slicenumber = this.slicesnumber + 1;
      if (this.is4D === true&&
        this.imagetime != undefined &&
        this.timestamp != undefined &&
        this.slicenum != undefined) {
        this.imagetime.innerText =
          "Image Time Id: " + currentframe + " of " + this.framesNumber;
        this.timestamp.innerText =
          "Image Time: " +
          larvitar.store.get(["viewports", "viewer", "timestamp"]); //normal that changes because it is not really a frame fixed, because the frames are 97 and not 12
        this.slicenum.innerText = "Slice: " + myslice + " of " + slicenumber;
      }
      if (this.is4D === false&&
        this.imagetime != undefined &&
        this.timestamp != undefined &&
        this.slicenum != undefined) {
        this.imagetime.innerText = "";
        this.timestamp.innerText = ""; //normal that changes because it is not really a frame fixed, because the frames are 97 and not 12
        this.slicenum.innerText = "Slice: " + myslice + " of " + slicenumber;
      }
    } else {
      // Handle 'slice' mode
      const toolData = getToolState(element, "stack");
      if (!toolData || !toolData.data || !toolData.data.length) {
        return;
      }

      const stackData = toolData.data[0];
      const currentIndex = stackData.currentImageIdIndex;
      const numberOfSlices =
        Math.ceil(stackData.imageIds.length / this.framesNumber) - 1; // Your total number of slices
      this.slicesnumber = numberOfSlices;

      // Calculate validIndex for looping within the specified range in 'slice' mode
      // console.log(fixedSlice);
      // console.log(fixedFrame);
      const startFrame = fixedSlice * framesNumber; //0,12
      const endFrame = (fixedSlice + 1) * framesNumber - 1; //11,23

      // Calculate the potential new index without considering looping
      let newImageIdIndex = currentIndex + direction;

      // Check if the new index is within the valid range for the current slice
      // Calculate validIndex for looping within the specified range in 'slice' mode

      // Calculate validIndex for looping within the specified range in 'slice' mode
      //i want to loop in slice mode through frames, not in stack mode,
      //but i want to consider that the loop starts from fixed frame and loops from it
      //in a range [currentframe,Y*numberofframes-1][(Y-1)*numberofframes,currentframe]
      //knowing that Y is the current slice index=sliceIndex
      // console.log(stackData.imageIds);
      // console.log(newImageIdIndex);
      // console.log(startFrame);
      // console.log(endFrame);
      //PROBLEM AFTER FRAME 25
      if (newImageIdIndex < startFrame) {
        newImageIdIndex = startFrame;
      } else if (newImageIdIndex > endFrame) {
        newImageIdIndex = startFrame;
      } else if (newImageIdIndex >= stackData.imageIds.length) {
        newImageIdIndex = startFrame;
        // console.log("missing frames, coming back to start Frame");
      }

      // Scroll to the calculated index
      scrollToIndex(element, newImageIdIndex);
      // console.log(this.imagetime);
      // console.log(newImageIdIndex + 1 - fixedSlice * this.framesNumber);
      let currentframe = newImageIdIndex + 1 - fixedSlice * this.framesNumber;
      // console.log(this.fixedSlice);
      if (this.is4D === true&&
        this.imagetime != undefined &&
        this.timestamp != undefined &&
        this.slicenum != undefined
      ) {
        let myslice = fixedSlice + 1;
        let slicenumber = this.slicesnumber + 1;
        this.imagetime.innerText =
          "Image Time Id: " + currentframe + " of " + this.framesNumber;
        this.timestamp.innerText =
          "Image Time: " +
          larvitar.store.get(["viewports", "viewer", "timestamp"]);
        this.slicenum.innerText = "Slice: " + myslice + " of " + slicenumber;
      } else if (this.isMultiframe === true&&
        this.imagetime != undefined &&
        this.timestamp != undefined &&
        this.slicenum != undefined) {
        let myslice = fixedSlice + 1;
        let slicenumber = this.slicesnumber + 1;
        this.imagetime.innerText = "";
        this.timestamp.innerText =
          "Image Time Id: " + currentframe + " of " + this.framesNumber;
        this.slicenum.innerText = "Slice: " + myslice + " of " + slicenumber;
      }
    }
  }

  scrollWithoutSkipping(stackData, pendingEvent, element) {
    const newImageHandler = event => {
      const index = stackData.imageIds.indexOf(event.detail.image.imageId);

      if (index === pendingEvent.index) {
        stackData.pending = [];
        element.removeEventListener(
          "cornerstoneimagerendered",
          newImageHandler
        );
      }
    };

    element.addEventListener("cornerstoneimagerendered", newImageHandler);
    scrollToIndex(element, pendingEvent.index);
  }
}
