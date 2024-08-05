import { getInstanceGSPSDict } from "../../loaders/commonLoader";
import cornerstone, { getEnabledElement } from "cornerstone-core";
import csTools from "cornerstone-tools";
import { ViewportComplete } from "../types";
import { Series } from "../../types";
import { redrawImage, resetViewports } from "../../imageRendering";
import {
  applyDisplayShutter,
  applyMask,
  applyModalityLUT,
  applySoftcopyLUT,
  applySoftcopyPresentationLUT,
  applySpatialTransformation,
  applyZoomPan,
  retrieveAnnotationsToolData,
  retrieveOverlayToolData
} from "./gspsUtils";
const drawJoinedLines = csTools.importInternal("drawing/drawJoinedLines");
const toolColors = csTools.toolColors;
const setShadow = csTools.importInternal("drawing/setShadow");
const drawEllipse = csTools.importInternal("drawing/drawEllipse");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const drawHandles = csTools.importInternal("drawing/drawHandles");
const BaseTool = csTools.importInternal("base/BaseTool");
const { wwwcCursor } = csTools.importInternal("tools/cursors");
const drawLink = csTools.importInternal("drawing/drawLink");

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
  public toolAnnotations: any[] = [];
  public canvas?: Element;
  constructor(props: any = {}) {
    const defaultProps = {
      name: "Gsps",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        orientation: 0
      },
      svgCursor: wwwcCursor
    };

    super(props, defaultProps);
    this.configuration = super.configuration;
    this.name = defaultProps.name;
  }

  async activeCallback(element: HTMLElement) {
    const gspsDict = getInstanceGSPSDict();
    const activeElement = await this.handleElement(element);
    let canvas: HTMLCanvasElement | null = null;
    for (let child of element.children) {
      if (child.classList.contains("cornerstone-canvas")) {
        canvas = child as HTMLCanvasElement;
        break; // Exit the loop once we find the element
      }
    }

    const image = activeElement.image;
    if (image) {
      const { manager, seriesId } = this.retrieveLarvitarManager(image.imageId);
      if (manager) {
        //const viewports: boolean = store.get(["viewports", element.id]);
        const serie = manager[seriesId];
        const instanceUID =
          serie.instances[image.imageId].metadata.instanceUID!;
        //const index=serie.imageIds.findIndex(index=>index===image.imageId)
        if (gspsDict && gspsDict[instanceUID]) {
          const gspsSeriesId = gspsDict[instanceUID]![0];
          const gspsSeries = manager[gspsSeriesId.seriesId];
          const gspsMetadata =
            gspsSeries.instances[gspsSeriesId.imageId].metadata;
          const viewport = cornerstone.getViewport(element);
          if (viewport) {
            applySoftcopyLUT(gspsMetadata, viewport);
            applyModalityLUT(gspsMetadata, image, viewport);
            applySoftcopyPresentationLUT(gspsMetadata, viewport);
            applyMask(serie as Series, element);

            applyDisplayShutter(gspsMetadata, element, image);

            const graphicLayers = gspsMetadata.x00700060; // Assuming this is the parsed Graphic Layer Sequence
            //understand how to integrate graphic Groups
            const graphicGroups = gspsMetadata.x00700234;
            retrieveOverlayToolData(
              gspsMetadata,
              this.toolAnnotations,
              graphicGroups
            );
            retrieveAnnotationsToolData(
              gspsMetadata,
              image,
              this.toolAnnotations,
              canvas,
              graphicLayers,
              graphicGroups
            );
            applyZoomPan(gspsMetadata, viewport as ViewportComplete);
            applySpatialTransformation(
              gspsMetadata,
              element,
              viewport as ViewportComplete
            );

            cornerstone.setViewport(element, viewport);
          }
        }
      }
    }
  }
  renderToolData(evt: any) {
    const toolData = this.toolAnnotations;

    if (!toolData) {
      return;
    }

    const eventData = evt.detail;
    const { element, image } = eventData;

    const context = getNewContext(eventData.canvasContext.canvas);
    // Configure

    draw(context, (context: CanvasRenderingContext2D) => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.length; i++) {
        const data = toolData[i];
        const color = toolColors.getColorIfActive(data);
        if (data.isOverlay === true) {
          if (data.visible === false) {
            return;
          }

          const layerCanvas = document.createElement("canvas");
          layerCanvas.width = image.width;
          layerCanvas.height = image.height;

          const layerContext = layerCanvas.getContext("2d");
          if (!layerContext) {
            console.error("Failed to get 2D context for layerCanvas.");
            return;
          }

          layerContext.fillStyle = data.fillStyle;

          if (data.type === "R") {
            layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
            layerContext.globalCompositeOperation = "xor";
          }

          let i = 0;
          for (let y = 0; y < data.rows!; y++) {
            for (let x = 0; x < data.columns!; x++) {
              if (data.pixelData[i++] > 0) {
                layerContext.fillRect(x, y, 1, 1);
              }
            }
          }

          // Guard against non-number values for overlay coordinates
          const overlayX = !isNaN(data.x!) && isFinite(data.x!) ? data.x : 0;
          const overlayY = !isNaN(data.y!) && isFinite(data.y!) ? data.y : 0;

          // Draw the overlay layer onto the canvas
          layerContext.drawImage(layerCanvas, overlayX!, overlayY!);
        } else if (data.isGraphicAnnotation === true) {
          if (data.visible === false) {
            continue;
          }

          setShadow(context, this.configuration);

          if (data.type === "POINT") {
            const options = {
              color,
              fillStyle: data.isgraphicFilled ? color : null,
              handleRadius: 6
            };
            drawHandles(
              context,
              eventData,
              this.configuration.mouseLocation.handles,
              options
            );
          } else if (data.type === "ELLIPSE" || data.type === "CIRCLE") {
            const ellipseCircleOptions = {
              color,
              fillStyle: data.isgraphicFilled ? color : null
            };
            drawEllipse(
              context,
              element,
              data.handles.start,
              data.handles.end,
              ellipseCircleOptions,
              "pixel",
              data.handles.initialRotation
            );
          } else if ((data.type = "POLYLINE")) {
            const isNotTheFirstHandle = data.handles.points.length > 1;
            const polylineOptions = {
              color,
              fillStyle: data.isgraphicFilled ? color : null
            };
            if (isNotTheFirstHandle) {
              for (let j = 0; j < data.handles.points.length; j++) {
                const lines = [...data.handles.points[j].lines];

                drawJoinedLines(
                  context,
                  element,
                  data.handles.points[j],
                  lines,
                  polylineOptions
                );
              }
            }
          }
        } else if (data.isTextAnnotation === true) {
          const textBox = data.handles.textBox;
          context.font = "Arial";
          context.fillStyle = color;
          context.textAlign = textBox.textFormat;
          // Set the text baseline to top
          context.textBaseline = "top";
          const textMetrics = context.measureText(textBox.text);
          const fontSize = parseInt(
            context.font.match(/\d+/)! as unknown as string,
            10
          );
          let textX = textBox.x;
          let textY =
            textBox.boundingBox.top +
            textBox.boundingBox.height / 2 -
            fontSize / 2;

          switch (textBox.textFormat) {
            case "LEFT":
              textX = textBox.boundingBox.left;
              break;
            case "RIGHT":
              textX =
                textBox.x + textBox.boundingBox.width / 2 - textMetrics.width;
              break;
            case "CENTER":
              textX = textBox.x - textMetrics.width / 2;
              break;
          }

          // Draw the text
          context.fillText(textBox.text, textX, textY);

          // Set the stroke style for the rectangle
          context.strokeStyle = color; // You can set this to a different color if needed

          // Define the rectangle path

          context.rect(
            textBox.boundingBox.left,
            textBox.boundingBox.top,
            textBox.boundingBox.width,
            textBox.boundingBox.height
          );

          // Draw the rectangle stroke
          context.stroke();

          // Draw dashed link line between tool and text
          if (
            textBox.anchorPoint.x &&
            textBox.anchorPoint.y &&
            textBox.anchorpointVisibility
          )
            drawLink(
              [textBox.anchorPoint],
              { x: textBox.x, y: textBox.y },
              textBox.boundingBox,
              context,
              color,
              2
            );
        }
      }
    });
  }
  async disabledCallback(element: HTMLElement) {
    redrawImage(element.id);
    resetViewports([element.id]);
  }
}
