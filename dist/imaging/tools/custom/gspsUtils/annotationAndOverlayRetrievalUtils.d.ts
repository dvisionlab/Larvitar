import type { AnnotationDetails, ToolAnnotations, MergedDetails } from "./types";
import { MetaData } from "../../../types";
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
export declare function retrieveAnnotationsToolData(metadata: MetaData, toolAnnotations: ToolAnnotations, graphicLayers?: MetaData[], graphicGroups?: MetaData[]): void;
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
export declare function retrieveTextObjectDetails(textObject: MetaData, annotation: AnnotationDetails, toolAnnotations: ToolAnnotations): void;
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
export declare function retrieveGraphicObjectDetails(graphicObject: MetaData, annotation: AnnotationDetails, toolAnnotations: ToolAnnotations): void;
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
export declare function retrieveCompoundObjectDetails(compoundObject: MetaData, annotation: AnnotationDetails, toolAnnotations: ToolAnnotations): void;
/**  Finds and returns the graphic layer that matches a given annotation ID from the graphic layers array,
as described in the DICOM standard for managing presentation state annotations (0070,0002).
* @name findGraphicLayer
 * @protected
 * @param  {string} annotationID //ps metadata
 * @param  {MetaData[]} graphicLayers //annotations array
 *
 * @returns {void}
 */
export declare function findGraphicLayer(annotationID?: string, graphicLayers?: MetaData[]): MetaData | undefined;
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
export declare function setToolAnnotationsAndOverlays(newData: MergedDetails, toolAnnotations: ToolAnnotations): void;
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
export declare function retrieveOverlayToolData(metadata: MetaData, toolAnnotations: ToolAnnotations, graphicGroups?: MetaData[]): void;
