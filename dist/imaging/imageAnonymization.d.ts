/** @module imaging/imageAnonymization
 *  @desc This file provides anonymization functionalities on DICOM images
 */
import { Series } from "./types";
/**
 * Anonymize a series by replacing all metadata with random values
 * @function anonymize
 * @param {Series} series - series to anonymize
 * @returns {Series} anonymized series
 */
export declare const anonymize: (series: Series) => Series;
