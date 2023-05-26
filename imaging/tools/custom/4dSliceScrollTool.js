/** @module imaging/tools/custom/4dSliceScrollTool
 *  @desc  This file provides functionalities for an alternative scroll tool 
 *  to handle 4d exam and navigate to the correct slice
 *         
 *         
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
const external = cornerstoneTools.external;

const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const scroll = cornerstoneTools.importInternal("util/scroll");
const  scrollToIndex = cornerstoneTools.importInternal("util/scrollToIndex");
const getToolState = cornerstoneTools.getToolState;
const clip =  cornerstoneTools.importInternal("util/clip");

/**
 * @public
 * @class 4DScrollMouseWheelTool
 * @memberof Tools
 *
 * @classdesc Tool for scrolling through a series using the mouse wheel.
 * @extends Tools.Base.BaseTool
 */
export default class Slice4DScrollMouseWheelTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'Slice4DScrollMouseWheel',
      supportedInteractionTypes: ['MouseWheel'],
      configuration: {
        loop: false,
        allowSkipping: true,
        invert: false,
      },
    };
    console.log('building wheel tool');
    super(props, defaultProps);
  }

  mouseWheelCallback(evt) {
    const { direction: images, element } = evt.detail;
    const { loop, allowSkipping, invert, frameNumber } = this.configuration;
    const direction = invert ? (images * frameNumber)*(-1) : (images * frameNumber);
    console.log('wheel callback');
    console.log('Images ', images);
    console.log('Direction ', direction);
    scroll(element, direction, loop, allowSkipping);
    // scroll4DSlices(element, direction, loop, allowSkipping);
  }
}
/**
 * Scrolls through the slice of a 4D stack.
 * @export @public @method
 * @name scroll4DSlices
 *
 * @param  {HTMLElement} element          The element to scroll.
 * @param  {number} images                The number of images to scroll through.
 * @param  {type} [loop = false]          Whether to loop the scrolling.
 * @param  {type} [allowSkipping = true]  Whether frames can be skipped.
 * @returns {void}
 */
const scroll4DSlices = function(element, images, loop, allowSkipping, frameNumber) {
    const toolData = getToolState(element, 'stack');

    if (!toolData || !toolData.data || !toolData.data.length) {
        return;
    }

    const stackData = toolData.data[0];

    if (!stackData.pending) {
        stackData.pending = [];
    }
    
    let newImageIdIndex = stackData.currentImageIdIndex + images ;//+ 1 + frameNumber;
    console.log('currentImageIdIndex', stackData.currentImageIdIndex)
    console.log('newImageIdIndex calculated ', newImageIdIndex);
    if (loop) {
        const nbImages = stackData.imageIds.length;
        newImageIdIndex %= nbImages;
    } else {
        newImageIdIndex = clip(newImageIdIndex, 0, stackData.imageIds.length - 1);
        console.log('newImageIdIndex after clip  ', newImageIdIndex);
    }

    if (allowSkipping) {
        scrollToIndex(element, newImageIdIndex);
    } else {
        const pendingEvent = {
          index: newImageIdIndex,
        };

        stackData.pending.push(pendingEvent);
        scrollWithoutSkipping(stackData, pendingEvent, element);
    }
}

/**
 * Recursively scrolls the stack until the desired image is reached.
 * @private
 * @method
 * @name scrollWithoutSkipping
 *
 * @param  {type} stackData    Data object containing information about the stack.
 * @param  {Object} pendingEvent The event to process next.
 * @param  {HTMLElement} element      The element being scrolled through.
 * @returns {void}
 */
function scrollWithoutSkipping(stackData, pendingEvent, element) {
  if (stackData.pending[0] === pendingEvent) {
    if (stackData.currentImageIdIndex === pendingEvent.index) {
      stackData.pending.splice(stackData.pending.indexOf(pendingEvent), 1);

      if (stackData.pending.length > 0) {
        scrollWithoutSkipping(stackData, stackData.pending[0], element);
      }

      return;
    }

    const newImageHandler = function(event) {
      const index = stackData.imageIds.indexOf(event.detail.image.imageId);

      if (index === pendingEvent.index) {
        stackData.pending.splice(stackData.pending.indexOf(pendingEvent), 1);
        element.removeEventListener(
          external.cornerstone.EVENTS.NEW_IMAGE,
          newImageHandler
        );

        if (stackData.pending.length > 0) {
          scrollWithoutSkipping(stackData, stackData.pending[0], element);
        }
      }
    };

    element.addEventListener(
      external.cornerstone.EVENTS.NEW_IMAGE,
      newImageHandler
    );

    scrollToIndex(element, pendingEvent.index);
  }
}
