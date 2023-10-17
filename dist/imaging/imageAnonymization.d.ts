/** @module imaging/imageAnonymization
 *  @desc This file provides anonymization functionalities on DICOM images
 * following http://dicom.nema.org/medical/dicom/current/output/html/part15.html#chapter_E
 */
import { Series } from "./types";
/**
 * Anonymize DICOM series' metadata using sha256
 * @function anonymize
 * @param {Object} series - Cornerstone series object
 * @returns {Object} anonymized_series: Cornerstone anonymized series object
 */
export declare const anonymize: (series: Series) => Series;
