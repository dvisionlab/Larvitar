import type {
  AnnotationDetails,
  TextDetails,
  CompoundDetails,
  GraphicDetails,
  MajorTicks,
  ToolAnnotations,
  MergedDetails
} from "./types";
import { MetaData } from "../../../types";
import { Overlay } from "../../types";
import { convertCIELabToRGBWithRefs } from "./genericDrawingUtils";
import { logger } from "../../../../logger";

//RETRIEVE ANNOTATIONS

/** 
 Extracts annotation sequences (text and graphic objects) from DICOM metadata,
 organizing them for display over the image, including handling of graphic
 layers and rendering order.
* @name retrieveAnnotationsToolData
 * @protected
 * @param  {MetaData} textObject //ps metadata
 * @param  {ToolAnnotations} toolAnnotations //annotations array
 * @param  {MetaData[]} graphicLayers //graphic layers metadata array
 * @param  {MetaData[]} graphicGroups //graphic groups metadata array
 *
 * @returns {void}
 */
export function retrieveAnnotationsToolData(
  metadata: MetaData,
  toolAnnotations: ToolAnnotations,
  graphicLayers?: MetaData[],
  graphicGroups?: MetaData[]
) {
  const angle = metadata.x00700042;
  // Extract Graphic Annotation Sequence
  const graphicAnnotationSequence = metadata.x00700001; // Graphic Annotation Sequence
  if (graphicAnnotationSequence) {
    graphicAnnotationSequence.forEach((annotation: MetaData) => {
      const annotationID = annotation.x00700002; // Graphic Layer

      const targetLayer = findGraphicLayer(
        annotationID,
        graphicLayers
      ) as MetaData;

      const annotationDetails: AnnotationDetails = {
        description: targetLayer?.x00700068,
        annotationID,
        annotationRenderingOrder: targetLayer.x00700062,
        presentationGSValue: targetLayer.x00700066,
        annotationCIELabColor: targetLayer.x00700401,
        annotationDescription: targetLayer.x00700068,
        imageUIDsToApply: annotation.x00081140?.map(
          element => element.x00081155!
        )
      };

      // Extract Text Objects
      const textObjectSequence = annotation.x00700008; // Text Object Sequence
      if (textObjectSequence) {
        textObjectSequence.forEach((textObject: MetaData) => {
          retrieveTextObjectDetails(
            textObject,
            annotationDetails,
            toolAnnotations
          );
        });
      }

      // Extract Graphics Objects
      const graphicObjectSequence = annotation.x00700009; // Graphic Object Sequence
      if (graphicObjectSequence) {
        graphicObjectSequence.forEach((graphicObject: MetaData) => {
          retrieveGraphicObjectDetails(
            graphicObject,
            annotationDetails,
            toolAnnotations
          );
        });
      }
      // Extract Graphics Objects
      const compoundGraphicSequence = annotation.x00700209; // Graphic Object Sequence
      if (compoundGraphicSequence) {
        compoundGraphicSequence.forEach((compoundObject: MetaData) => {
          retrieveCompoundObjectDetails(
            compoundObject,
            annotationDetails,
            toolAnnotations
          );
        });
      }
    });
  }
}

//TEXT ANNOTATION
/** 
  Processes individual text objects from the DICOM annotation sequence,
  extracting details like position, bounding box, and style for display over the image.
* @name retrieveTextObjectDetails
 * @protected
 * @param  {MetaData} textObject //ps metadata
 * @param  {AnnotationDetails} annotation //annotations array
 * @param  {ToolAnnotations} toolAnnotations //annotations array
 *
 * @returns {void}
 */
export function retrieveTextObjectDetails(
  textObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
) {
  if (textObject.x00700006) {
    const tlhc = {
      x:
        textObject.x00700010 && textObject.x00700010[0]
          ? textObject.x00700010[0]
          : null,
      y:
        textObject.x00700010 && textObject.x00700010[1]
          ? textObject.x00700010[1]
          : null
    };
    const brhc = {
      x:
        textObject.x00700011 && textObject.x00700011[0]
          ? textObject.x00700011[0]
          : null,
      y:
        textObject.x00700011 && textObject.x00700011[1]
          ? textObject.x00700011[1]
          : null
    };
    const anchorPoint = {
      x:
        textObject.x00700014 && textObject.x00700014[0]
          ? textObject.x00700014[0]
          : null,
      y:
        textObject.x00700014 && textObject.x00700014[1]
          ? textObject.x00700014[1]
          : null
    };

    setToolAnnotationsAndOverlays(
      {
        imageUIDsToApply: annotation.imageUIDsToApply,
        renderingOrder: annotation.annotationRenderingOrder!,
        isTextAnnotation: true,
        unformattedTextValue: textObject.x00700006, // Unformatted Text Value
        textFormat: textObject.x00700012,
        boundingBoxUnits: textObject.x00700003, // Bounding Box Annotation Units
        anchorPointUnits: textObject.x00700004, // Anchor Point Annotation Units
        boundingBox: {
          tlhc,
          brhc
        },
        anchorPointVisibility: textObject.x00700015, // Anchor Point Visibility
        anchorPoint,
        compoundGraphicInstanceUID: textObject.x00700226,
        graphicGroupID: textObject.x00700295,
        trackingID: textObject.x00620020,
        trackingUID: textObject.x00620021,
        textStyleSequence: textObject.x00700231
          ? {
              fontName: textObject.x00700231[0].x00700227,
              fontNameType: textObject.x00700231[0].x00700228,
              cssFontName: textObject.x00700231[0].x00700229,
              textColorCIELabValue: textObject.x00700231[0].x00700241,
              horizontalAlignment: textObject.x00700231[0].x00700242,
              verticalAlignment: textObject.x00700231[0].x00700243,
              shadowStyle: textObject.x00700231[0].x00700244,
              shadowOffsetX: textObject.x00700231[0].x00700245,
              shadowOffsetY: textObject.x00700231[0].x00700246,
              shadowColorCIELabValue: textObject.x00700231[0].x00700247,
              shadowOpacity: textObject.x00700231[0].x00700258,
              underlined: textObject.x00700231[0].x00700248,
              bold: textObject.x00700231[0].x00700249,
              italic: textObject.x00700231[0].x00700250
            }
          : null
      } as unknown as TextDetails,
      toolAnnotations
    );
  }
}

//GRAPHIC ANNOTATION
/** 
 Processes individual graphic objects (e.g., lines, shapes)
 from the DICOM annotation sequence,
 extracting details like coordinates and styles for display over the image.
* @name retrieveGraphicObjectDetails
 * @protected
 * @param  {MetaData} graphicObject //ps metadata
 * @param  {AnnotationDetails} annotation //annotations array
 * @param  {ToolAnnotations} toolAnnotations //annotations array
 *
 * @returns {void}
 */
export function retrieveGraphicObjectDetails(
  graphicObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
) {
  setToolAnnotationsAndOverlays(
    {
      imageUIDsToApply: annotation.imageUIDsToApply,
      isGraphicAnnotation: true,
      renderingOrder: annotation.annotationRenderingOrder,
      graphicAnnotationUnits: graphicObject.x00700005,
      graphicDimensions: graphicObject.x00700020,
      graphicPointsNumber: graphicObject.x00700021,
      graphicData: graphicObject.x00700022,
      graphicType: graphicObject.x00700023,
      graphicFilled: graphicObject.x00700024,
      compoundGraphicInstanceUID: graphicObject.x00700226,
      graphicGroupID: graphicObject.x00700295,
      trackingID: graphicObject.x00620020,
      trackingUID: graphicObject.x00620021,
      lineStyleSequence: graphicObject.x00700232
        ? {
            patternOnColorCIELabValue: graphicObject.x00700232[0].x00700251,
            patternOffColorCIELabValue: graphicObject.x00700232[0].x00700252,
            patternOnOpacity: graphicObject.x00700232[0].x00700284,
            patternOffOpacity: graphicObject.x00700232[0].x00700285,
            lineThickness: graphicObject.x00700232[0].x00700253,
            lineDashingStyle: graphicObject.x00700232[0].x00700254,
            linePattern: graphicObject.x00700232[0].x00700255,
            shadowStyle: graphicObject.x00700232[0].x00700244,
            shadowOffsetX: graphicObject.x00700232[0].x00700245,
            shadowOffsetY: graphicObject.x00700232[0].x00700246,
            shadowColorCIELabValue: graphicObject.x00700232[0].x00700247,
            shadowOpacity: graphicObject.x00700232[0].x00700258
          }
        : null
    } as GraphicDetails,
    toolAnnotations
  );
}

//COMPOUND ANNOTATIONS
/** 
  Handles more complex graphic annotations,
  including compound objects with properties like rotation, major ticks,
  and line styles, according to the DICOM standard.
* @name findGraphicLayer
 * @protected
 * @param  {MetaData} compoundObject //ps metadata
 * @param  {AnnotationDetails} annotation //annotations array
 * @param  {ToolAnnotations} toolAnnotations //annotations array
 *
 * @returns {void}
 */
export function retrieveCompoundObjectDetails(
  compoundObject: MetaData,
  annotation: AnnotationDetails,
  toolAnnotations: ToolAnnotations
) {
  const compoundDetails = {
    imageUIDsToApply: annotation.imageUIDsToApply,
    isCompoundAnnotation: true,
    renderingOrder: annotation.annotationRenderingOrder,
    compoundGraphicUnits: compoundObject.x00700282,
    graphicDimensions: compoundObject.x00700020,
    graphicPointsNumber: compoundObject.x00700021,
    graphicData: compoundObject.x00700022,
    graphicType: compoundObject.x00700294,
    graphicFilled: compoundObject.x00700024,
    compoundGraphicInstanceUID: compoundObject.x00700226,
    graphicGroupID: compoundObject.x00700295,
    rotationAngle: compoundObject.x00700230,
    rotationPoint: compoundObject.x00700273,
    gapLength: compoundObject.x00700261,
    diameterOfVisibility: compoundObject.x00700262,
    majorTicks: [] as MajorTicks[],
    tickFormat: compoundObject.x00700274,
    tickLabelFormat: compoundObject.x00700279,
    showTick: compoundObject.x00700278,
    lineStyleSequence: compoundObject.x00700232
      ? {
          patternOnColorCIELabValue: compoundObject.x00700232[0].x00700251,
          patternOffColorCIELabValue: compoundObject.x00700232[0].x00700252,
          patternOnOpacity: compoundObject.x00700232[0].x00700284,
          patternOffOpacity: compoundObject.x00700232[0].x00700285,
          lineThickness: compoundObject.x00700232[0].x00700253,
          lineDashingStyle: compoundObject.x00700232[0].x00700254,
          linePattern: compoundObject.x00700232[0].x00700255,
          shadowStyle: compoundObject.x00700232[0].x00700244,
          shadowOffsetX: compoundObject.x00700232[0].x00700245,
          shadowOffsetY: compoundObject.x00700232[0].x00700246,
          shadowColorCIELabValue: compoundObject.x00700232[0].x00700247,
          shadowOpacity: compoundObject.x00700232[0].x00700258
        }
      : null
  };
  if (compoundObject.x00700287?.length) {
    const ticks = compoundObject.x00700287;
    for (let i = 0; i < ticks?.length; i++) {
      compoundDetails.majorTicks.push({
        tickPosition: ticks[i].x00700288,
        tickLabel: ticks[i].x00700289
      });
    }
  }
  setToolAnnotationsAndOverlays(
    compoundDetails as CompoundDetails,
    toolAnnotations
  );
}

/**  Finds and returns the graphic layer that matches a given annotation ID from the graphic layers array,
as described in the DICOM standard for managing presentation state annotations (0070,0002).
* @name findGraphicLayer
 * @protected
 * @param  {string} annotationID //ps metadata
 * @param  {MetaData[]} graphicLayers //annotations array
 *
 * @returns {void}
 */
export function findGraphicLayer(
  annotationID?: string,
  graphicLayers?: MetaData[]
) {
  if (graphicLayers) {
    for (const layer of graphicLayers) {
      if (layer.x00700002 === annotationID) {
        return layer;
      }
    }
  }
}

/**
 Inserts new annotation data into the tool annotations array in the correct rendering order,
 ensuring compliance with the DICOM rendering sequence standards.
 * @name retrieveOverlayToolData
 * @protected
 * @param  {MergedDetails} newData //ps metadata
 * @param  {ToolAnnotations[]} toolAnnotations //annotations array
 *
 * @returns {void}
 */
export function setToolAnnotationsAndOverlays(
  newData: MergedDetails,
  toolAnnotations: ToolAnnotations
) {
  const renderingOrder = newData.renderingOrder!;

  // Find the correct position to insert the new data
  let insertIndex = toolAnnotations.findIndex(
    (item: MergedDetails) => item.renderingOrder! > renderingOrder
  );

  // If no such position is found, insert at the end
  if (insertIndex === -1) {
    insertIndex = toolAnnotations.length;
  }

  // Insert the new data at the determined position
  toolAnnotations.splice(insertIndex, 0, newData);
}

// OVERLAY
/**
 *  Extracts and structures overlay data (e.g., ROI, label, description)
  from DICOM metadata to manage overlays that can be rendered over the image.
 * @name retrieveOverlayToolData
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ToolAnnotations} toolAnnotations //annotations array
 * @param  {MetaData[]} graphicGroups //graphic groups whose the annotation belongs to
 *
 * @returns {void}
 */
export function retrieveOverlayToolData(
  metadata: MetaData,
  toolAnnotations: ToolAnnotations,
  graphicGroups?: MetaData[]
) {
  const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
  const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Color Value
  const shutterShape = metadata.x00181600; // Shutter Shape (should be BITMAP)
  const shutterOverlayGroup = metadata.x00181623; // Shutter Overlay Group
  // Guard clause for undefined shutterOverlayGroup
  if (!shutterOverlayGroup) {
    return;
  }

  // Retrieve overlay metadata based on shutterOverlayGroup
  const rows = metadata[("x" + shutterOverlayGroup + "0010") as keyof MetaData];
  const cols = metadata[("x" + shutterOverlayGroup + "0011") as keyof MetaData];
  const type = metadata[("x" + shutterOverlayGroup + "0040") as keyof MetaData];
  const origin =
    metadata[("x" + shutterOverlayGroup + "0050") as keyof MetaData];
  const bitsAllocated =
    metadata[("x" + shutterOverlayGroup + "0100") as keyof MetaData];
  const bitPosition =
    metadata[("x" + shutterOverlayGroup + "0102") as keyof MetaData];
  const overlayData =
    metadata[("x" + shutterOverlayGroup + "3000") as keyof MetaData];
  const description =
    metadata[("x" + shutterOverlayGroup + "0022") as keyof MetaData];
  const subtype =
    metadata[("x" + shutterOverlayGroup + "0045") as keyof MetaData];
  const label =
    metadata[("x" + shutterOverlayGroup + "1500") as keyof MetaData];
  const roiArea =
    metadata[("x" + shutterOverlayGroup + "1301") as keyof MetaData];
  const roiMean =
    metadata[("x" + shutterOverlayGroup + "1302") as keyof MetaData];
  const roiStandardDeviation =
    metadata[("x" + shutterOverlayGroup + "1303") as keyof MetaData];
  const overlayActivationLayer =
    metadata[("x" + shutterOverlayGroup + "1001") as keyof MetaData]; //equal to layerOrder

  /*if (shutterShape !== "BITMAP") {
      logger.error("Unsupported shutter shape: ", shutterShape);
      return;
    }*/
  const overlayRenderingOrder = overlayActivationLayer;
  const presentationGSValue = presentationValue;
  const overlayCIELabColor = shutterPresentationColorValue;
  const overlayDescription = description;

  const color = overlayCIELabColor
    ? convertCIELabToRGBWithRefs(overlayCIELabColor)
    : [0, 0, 0];

  const overlay: Overlay = {
    isOverlay: true,
    renderingOrder: overlayRenderingOrder,
    canBeRendered: overlayActivationLayer ? true : false,
    rows: rows,
    columns: cols,
    type: type,
    pixelData: overlayData, // Assuming overlayData contains the pixel data
    description: overlayDescription,
    label: label,
    roiArea: roiArea,
    roiMean: roiMean,
    roiStandardDeviation: roiStandardDeviation,
    fillStyle: presentationGSValue
      ? `rgba(${presentationGSValue}, ${presentationGSValue}, ${presentationGSValue}, 1)`
      : `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`, // Example fill style, adjust as needed
    visible: true, // Example visibility flag, adjust as needed
    x: origin ? origin[1] - 1 : 0, // Adjust x based on origin
    y: origin ? origin[0] - 1 : 0, // Adjust y based on origin,
    bitsAllocated,
    bitPosition,
    subtype
  };
  if (overlay) setToolAnnotationsAndOverlays(overlay, toolAnnotations);
}
