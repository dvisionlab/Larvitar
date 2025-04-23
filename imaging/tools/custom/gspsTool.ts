import { retrieveDisplayShutter, applyMask } from "./gspsUtils/maskUtils";
import {
  applyModalityLUT,
  applySoftcopyLUT,
  applySoftcopyPresentationLUT
} from "./gspsUtils/LUTUtils";
import {
  applySpatialTransformation,
  applyZoomPan
} from "./gspsUtils/spatialTransformationUtils";
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
import { ImageManager, Series, MetaData, GSPSManager } from "../../types";
import * as csTools from "cornerstone-tools";
import cornerstone, {
  EnabledElement,
  getEnabledElement,
  Viewport
} from "cornerstone-core";
import {
  getGSPSManager,
  getImageManager,
  getImageTracker
} from "../../imageManagers";
import { redrawImage, resetViewports } from "../../imageRendering";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { MeasurementMouseEvent, ViewportComplete } from "../types";
import { ToolAnnotations } from "./gspsUtils/types";
import { logger } from "../../../logger";
const toolColors = csTools.toolColors;
const setShadow = csTools.importInternal("drawing/setShadow");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const BaseTool = csTools.importInternal("base/BaseTool");

/**
 * @public
 * @class GspsTool
 * @memberof Tools
 *
 * @classdesc Tool for visualizing presentation states over displayed image
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
  public name: string;
  //TODO-Laura create a correct type for toolAnnotations
  public toolAnnotations: ToolAnnotations = [];
  public showAnnotations: boolean = false;
  public canvas?: Element;
  public gspsMetadata?: MetaData;
  constructor(props: any = {}) {
    const defaultProps = {
      name: "Gsps",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {}
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
    if (activeElement) {
      const image = activeElement.image;
      const viewport = cornerstone.getViewport(element) as Viewport;
      this.originalViewport = structuredClone(viewport);

      const { manager, uniqueUID } = this.retrieveLarvitarManager(
        image!.imageId
      );

      if (manager) {
        const serie = manager[uniqueUID];
        const currentInstanceUID =
          serie.instances[image!.imageId].metadata.instanceUID!;
        let gspsManager: GSPSManager = getGSPSManager();
        if (gspsManager && gspsManager[currentInstanceUID]) {
          const gsps = gspsManager[currentInstanceUID][0];
          //check if active gsps is applicable on current displayed image
          if (gsps?.seriesId && gsps?.imageId) {
            const gspsSeries = manager[gsps.seriesId];
            const gspsImageId = gsps.imageId;
            const gspsMetadata = gspsSeries.instances[gspsImageId].metadata;

            this.gspsMetadata = gspsMetadata;
            this.showAnnotations = true;
            applySoftcopyLUT(gspsMetadata, viewport);
            cornerstone.setViewport(element, viewport);

            applyModalityLUT(gspsMetadata, image!, viewport);
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
              this.toolAnnotations,
              graphicLayers,
              graphicGroups
            );
            cornerstone.setViewport(element, viewport);
            this.gspsViewport = structuredClone(viewport);
          } else {
            this.gspsMetadata = undefined;
          }
        }
      }
    }
  }

  renderToolData(evt: MeasurementMouseEvent) {
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
    const { manager, uniqueUID } = this.retrieveLarvitarManager(image.imageId);
    let instanceUID: string | null = null;
    if (manager) {
      const serie = manager[uniqueUID];
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
    if (!this.gspsViewport && !this.originalViewport) return;
    const isZoomed = this.gspsViewport.scale !== this.originalViewport.scale;

    const isContrastModified =
      this.gspsViewport.voi.windowCenter !==
        this.originalViewport.voi.windowCenter ||
      this.gspsViewport.voi.windowWidth !==
        this.originalViewport.voi.windowWidth;

    if (isZoomed) {
      resetViewports([element.id], ["zoom"]);
    }
    if (isContrastModified) {
      resetViewports([element.id], ["contrast"]);
    }
    const enabledElement = getEnabledElement(element) as any as {
      viewport: ViewportComplete;
    };
    enabledElement.viewport!.displayedArea = undefined;
  }

  /*
   Handles the asynchronous availability of an image within a Cornerstone-enabled element,
   ensuring that the image is loaded before proceeding with operations.
*/
  handleElement(element: HTMLElement): Promise<EnabledElement | undefined> {
    try {
      const activeElement = cornerstone.getEnabledElement(element);

      // If image is already available, resolve immediately
      if (activeElement.image !== undefined) {
        return Promise.resolve(activeElement);
      }

      // Otherwise wait for the image to load
      return new Promise((resolve, reject) => {
        // When image is rendered
        element.addEventListener(
          "cornerstoneimagerendered",
          () => {
            resolve(cornerstone.getEnabledElement(element));
          },
          { once: true }
        );

        setTimeout(() => {
          reject(new Error("Image did not become available in time"));
        }, 5000);
      });
    } catch (error) {
      logger.error("Error processing element:", error);
      throw error;
    }
  }

  /*
   Retrieves the Larvitar manager and associated uniqueUID for a given imageId,
   facilitating DICOM-compliant image tracking and management.
*/
  retrieveLarvitarManager(imageId: string) {
    const parsedImageId: { scheme: string; url: string } =
      cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);

    const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
    const imageTracker = getImageTracker();
    const uniqueUID: string = imageTracker[rootImageId];
    const manager = getImageManager() as ImageManager;
    return { manager, uniqueUID };
  }
}
