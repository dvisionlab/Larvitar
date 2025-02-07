import { retrieveDisplayShutter, applyMask } from "./gspsUtils/maskUtils";
import {
  applyModalityLUT,
  applySoftcopyLUT,
  applySoftcopyPresentationLUT
} from "./gspsUtils/LUTUtils";
import {
  applySpatialTransformation,
  applyZoomPan
} from "./gspsUtils/spatialTransformationUtils.ts";
import {
  retrieveAnnotationsToolData,
  retrieveOverlayToolData
} from "./gspsUtils/annotationAndOverlayRetrievalUtils";
import {
  renderOverlay,
  renderGraphicAnnotation,
  renderCompoundAnnotation,
  renderTextAnnotation
} from "./gspsUtils/annotationAndOverlayRenderingUtils";
import { ImageManager, Series, MetaData } from "../../types";
import * as csTools from "cornerstone-tools";
import cornerstone, { getEnabledElement, Viewport } from "cornerstone-core";
import {
  getGSPSManager,
  getImageManager,
  getImageTracker
} from "../../imageManagers";
import { redrawImage, resetViewports } from "../../imageRendering";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { ViewportComplete } from "../types";
const toolColors = csTools.toolColors;
const setShadow = csTools.importInternal("drawing/setShadow");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const BaseTool = csTools.importInternal("base/BaseTool");

/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
  public name: string;
  public configuration: any = {};
  //TODO-Laura create a correct type for toolAnnotations
  public toolAnnotations: any = [];
  public showAnnotations: boolean = false;
  public canvas?: Element;
  public gspsMetadata?: MetaData;
  public layoutStore: any;
  constructor(props: any = {}) {
    const defaultProps = {
      name: "Gsps",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        orientation: 0
      }
    };

    super(props, defaultProps);
    this.configuration = super.configuration;
    this.name = defaultProps.name;
  }

  async enabledCallback(element: HTMLElement) {
    await this.activePassiveCallback(element);
  }

  async passiveCallback(element: HTMLElement) {
    await this.activePassiveCallback(element);
  }

  async activePassiveCallback(element: HTMLElement) {
    //current element, image and viewport data
    const activeElement = await this.handleElement(element);
    const image = activeElement.image;
    const viewport = cornerstone.getViewport(element) as Viewport;
    const currentStudyId = this.layoutStore.activePane.dicom.studyInstanceUID;
    //possible applicable active gsps on current study
    const currentActiveGSPSUIDs = this.layoutStore.availableGSPS[
      currentStudyId
    ]?.active.includes(true)
      ? this.layoutStore.availableGSPS[currentStudyId].value
      : null;
    // const gspsDict = get();
    getGSPSManager();
    if (image && viewport && currentActiveGSPSUIDs) {
      //find current image instanceUID
      const { manager, seriesId } = this.retrieveLarvitarManager(image.imageId);
      if (manager) {
        const serie = manager[seriesId];
        const currentInstanceUID =
          serie.instances[image.imageId].metadata.instanceUID!;
        //find first active gsps data (only one per time is applicable)
        const activeIndexes = this.layoutStore.availableGSPS[
          currentStudyId
        ]?.active
          .map((isActive: boolean, index: number) =>
            isActive === true ? index : -1
          ) // Map to index or -1
          .filter((index: number) => index !== -1);
        const gsps = this.findGSPSApplicableOnImage(
          activeIndexes,
          manager,
          currentActiveGSPSUIDs,
          gspsDict[currentInstanceUID]
        );

        //check if active gsps is applicable on current displayed image
        if (gsps?.gspsSeriesUID && gsps?.gspsInstanceUID) {
          const gspsSeries = manager[gsps.gspsSeriesUID];
          const gspsImageId = gspsSeries.instanceUIDs[gsps.gspsInstanceUID];
          const gspsMetadata = gspsSeries.instances[gspsImageId].metadata;

          this.gspsMetadata = gspsMetadata;
          this.showAnnotations = true;
          applySoftcopyLUT(gspsMetadata, viewport);
          cornerstone.setViewport(element, viewport);

          applyModalityLUT(gspsMetadata, image, viewport);
          cornerstone.setViewport(element, viewport);

          applySoftcopyPresentationLUT(gspsMetadata, viewport);
          cornerstone.setViewport(element, viewport);

          applyMask(serie as Series, element);
          cornerstone.setViewport(element, viewport);

          const graphicLayers = gspsMetadata.x00700060;
          const graphicGroups = gspsMetadata.x00700234;
          retrieveOverlayToolData(
            gspsMetadata,
            this.toolAnnotations,
            graphicGroups
          );
          cornerstone.setViewport(element, viewport);
          applyZoomPan(gspsMetadata, viewport as ViewportComplete, element);
          cornerstone.setViewport(element, viewport);

          applySpatialTransformation(
            gspsMetadata,
            viewport as ViewportComplete
          );
          cornerstone.setViewport(element, viewport);

          retrieveAnnotationsToolData(
            gspsMetadata,
            element,
            this.toolAnnotations,
            graphicLayers,
            graphicGroups
          );
          cornerstone.setViewport(element, viewport);
        } else {
          this.gspsMetadata = undefined;
        }
      }
    }
  }
  findGSPSApplicableOnImage(
    activeIndexes: number[],
    manager: any,
    currentActiveGSPSUIDs: any,
    currentGSPSDict: any
  ) {
    if (!currentGSPSDict) {
      console.warn("No gsps available.");
      return null;
    }
    // Iterate over activeIndexes
    for (const activeIndex of activeIndexes) {
      // Step 1: Get the GSPS Instance UID for the current active index
      const gspsInstanceUID = currentActiveGSPSUIDs[activeIndex];

      // Step 2: Get all series UIDs from the manager
      const allSeriesUIDs = Object.keys(manager);

      // Step 3: Find the GSPS Series UID
      const gspsSeriesUID = allSeriesUIDs.find(seriesId =>
        Object.keys(manager[seriesId].instanceUIDs).includes(gspsInstanceUID)
      );

      // Step 4: Extract the series IDs from gspsDict
      const seriesIdArray = currentGSPSDict.map((item: any) => item.seriesId);

      // Step 5: Check if gspsSeriesUID is in the seriesIdArray
      if (seriesIdArray && seriesIdArray.includes(gspsSeriesUID)) {
        //console.log(`Match found: PR Series ID ${gspsSeriesUID}`)
        return { gspsSeriesUID, gspsInstanceUID }; // Return the gspsSeriesUID when condition is met
      }
    }

    // If no match is found
    console.warn("No match found for this image for any active GSPS.");
    return null;
  }
  renderToolData(evt: any) {
    const toolData = this.toolAnnotations;

    if (!toolData) {
      return;
    }
    if (!this.gspsMetadata) {
      return;
    }
    const eventData = evt.detail;
    const { element, image } = eventData;
    const canvas = eventData.canvasContext.canvas;
    const context = getNewContext(eventData.canvasContext.canvas);
    const viewport = cornerstone.getViewport(element) as Viewport;
    const { manager, seriesId } = this.retrieveLarvitarManager(image.imageId);
    let instanceUID: string | null = null;
    if (manager) {
      const serie = manager[seriesId];
      instanceUID = serie.instances[image.imageId].metadata
        .instanceUID! as string;
    }
    // Configure
    draw(context, (context: CanvasRenderingContext2D) => {
      if (this.showAnnotations) {
        if (this.gspsMetadata) {
          retrieveDisplayShutter(
            this.gspsMetadata,
            element,
            image,
            canvas,
            viewport as ViewportComplete
          );
          cornerstone.setViewport(element, viewport);
        }
        // If we have tool data for this element - iterate over each set and draw it
        for (let i = 0; i < toolData.length; i++) {
          const data = toolData[i];

          const color = toolColors.getColorIfActive(data);
          // isValidImageUIDToApplyGSPS (for annotations)
          //1. if data.imageUIDsToApply contains the image
          //2. if data.imageUIDsToApply is undefined it means that it is applied to the images defined by gspsDict,
          // so of course to the current image (see activePassiveCallback)
          const isValidImageUIDToApplyGSPS =
            instanceUID &&
            (data.imageUIDsToApply?.includes(instanceUID) ||
              !data.imageUIDsToApply);
          //OVERLAY RENDERING
          if (data.isOverlay === true) {
            renderOverlay(data, image);
          }
          //GRAPHIC ANNOTATION
          else if (
            data.isGraphicAnnotation === true &&
            isValidImageUIDToApplyGSPS
          ) {
            if (data.visible === false) {
              continue;
            }
            setShadow(context, this.configuration);
            renderGraphicAnnotation(
              data,
              context,
              canvas,
              element,
              color,
              viewport as ViewportComplete,
              image
            );
          }
          //TEXT ANNOTATION
          else if (
            data.isTextAnnotation === true &&
            isValidImageUIDToApplyGSPS
          ) {
            renderTextAnnotation(
              data,
              context,
              color,
              element,
              image,
              viewport as ViewportComplete
            );
          }
          //COMPOUND ANNOTATION
          else if (
            data.isCompoundAnnotation === true &&
            isValidImageUIDToApplyGSPS
          ) {
            renderCompoundAnnotation(
              data,
              context,
              canvas,
              element,
              color,
              viewport as ViewportComplete,
              image
            );
          }
        }
      }
    });
  }

  async disabledCallback(element: HTMLElement) {
    redrawImage(element.id);
    this.resetViewportToDefault(element);
    this.showAnnotations = false;
  }

  resetViewportToDefault(element: HTMLElement) {
    resetViewports([element.id]);
    const enabledElement = getEnabledElement(element) as any;
    enabledElement.viewport!.displayedArea = undefined;
  }

  //TODO-Laura understand how to manage getEnabledElement(element) async (property image is undefined at first)
  /*
   Handles the asynchronous availability of an image within a Cornerstone-enabled element,
   ensuring that the image is loaded before proceeding with operations.
*/
  handleElement(element: HTMLElement): Promise<any> {
    try {
      const activeElement = cornerstone.getEnabledElement(element);

      // Return a promise that resolves when the image becomes available
      return new Promise((resolve, reject) => {
        const checkImageAvailability = setInterval(() => {
          if (activeElement.image !== undefined) {
            clearInterval(checkImageAvailability);
            console.debug("Image is now available", activeElement.image);
            resolve(activeElement); // Resolve the promise with the activeElement
          } else {
            console.debug("Image not yet available, continuing to poll...");
          }
        }, 100); // Poll every 100ms

        // Reject the promise if needed, e.g., after a timeout
        setTimeout(() => {
          clearInterval(checkImageAvailability);
          reject(new Error("Image did not become available in time"));
        }, 5000); // 5 seconds timeout
      });
    } catch (error) {
      console.error("Error processing element:", error);
      throw error; // Rethrow the error
    }
  }

  /*
   Retrieves the Larvitar manager and associated seriesUID for a given imageId,
   facilitating DICOM-compliant image tracking and management.
*/
  retrieveLarvitarManager(imageId: string) {
    const parsedImageId: { scheme: string; url: string } =
      cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);

    const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
    const imageTracker = getImageTracker();
    const seriesId: string = imageTracker[rootImageId];
    const manager = getImageManager() as ImageManager;
    return { manager, seriesId };
  }
}
