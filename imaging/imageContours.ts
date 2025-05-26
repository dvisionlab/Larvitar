/** @module imaging/imageContours
 *  @desc This file provides functionalities to render a set of points on a canvas.
 *        Use this in order to render image contours (e.g. from binary masks).
 */

// external libraries
import { each, range } from "lodash";
import { vec2 } from "cornerstone-core";
import { Contours } from "./types";

/*
 * This module provides the following functions to be exported:
 * parseContours(contoursData,pointBatchSize,segmentationName, viewports)
 */

/**
 * Parse raw data to contours object for each viewport
 * @export
 * @function parseContours
 * @param {Array} contoursData - Raw data
 * @param {Number} pointBatchSize - Number of points that defines a contour segment (default to 2)
 * @param {String} segmentationName - Mask object name
 * @param {Array} viewports - Viewport array ids
 * @returns {Number} Number of array elements consumed
 */
export const parseContours = function (
  contoursData: { [key: string]: Uint8Array }, // TODO-ts: check if this is correct @mronzoni
  pointBatchSize: number,
  segmentationName: string,
  viewports?: Array<string>
) {
  let contours: Contours = {};
  each(viewports, viewport => {
    contours[viewport] = {};
    contours[viewport][segmentationName] = [];
    let points = contoursData[viewport];

    if (!points) {
      return;
    }

    let numberOfSlices = points[0];
    points = points.slice(1);

    each(range(numberOfSlices), function () {
      let sliceSize = extractSlicePoints(
        contours,
        pointBatchSize,
        points,
        segmentationName,
        viewport
      );
      points = points.slice(sliceSize);
    });
  });

  return contours;
};

/* Internal module functions */

/**
 * From raw data, fill cornerstone tool data structure for ContoursTool for a single slice
 * @instance
 * @function populateContoursObject
 * @param {Number} pointBatchSize - Number of points that defines a contour segment
 * @param {Object} contours - Main contour tool object dict (to be filled)
 * @param {Number} lineNumber - Number of line to be rendered (a contour is made of n lines)
 * @param {Number} sliceNumber - Number of the slice in which the contour should be rendered
 * @param {String} segmentationName - Mask object name
 * @param {String} viewport - Viewport id
 * @param {Array} data - Raw data (array of pixel values)
 */
const populateContoursObject = function (
  pointBatchSize: number,
  contours: Contours,
  lineNumber: number,
  sliceNumber: number,
  segmentationName: string,
  viewport: string,
  data: Uint8Array
) {
  let coords: Array<{ x: number; y: number; lines: Array<vec2> }> = [];

  for (let i = 0; i < data.length; i += pointBatchSize) {
    let xy = data.slice(i, pointBatchSize + i);

    // always add the first item
    if (!coords.length) {
      coords.push({
        x: xy[0],
        y: xy[1],
        lines: []
      });
    }

    // add new items if different from the previous one
    else {
      //if (coords[coords.length - 1].x !== xy[0] &&
      //   coords[coords.length - 1].y !== xy[1]) {
      coords.push({
        x: xy[0],
        y: xy[1],
        lines: [
          {
            x: coords[coords.length - 1].x,
            y: coords[coords.length - 1].y
          }
        ]
      });
    }
  }

  // add line element to the first item
  if (coords[0]) {
    coords[0].lines = [
      {
        x: coords[coords.length - 1].x,
        y: coords[coords.length - 1].y
      }
    ];
  }

  contours[viewport][segmentationName][sliceNumber].lines[lineNumber] = coords;
};

/**
 * Extract each slice points from raw data array
 * @instance
 * @function extractSlicePoints
 * @param {Object} contours - Main contour tool object dict (to be filled)
 * @param {Number} pointBatchSize - Number of points that defines a contour segment (default to 2)
 * @param {Number} slicePoints - Number of contour points on a slice
 * @param {String} segmentationName - Mask object name
 * @param {String} viewport - Viewport id
 * @returns {Number} Number of array elements consumed
 */
const extractSlicePoints = function (
  contours: Contours,
  pointBatchSize: number,
  slicePoints: Uint8Array, // TODO-ts: check if this is correct @mronzoni
  segmentationName: string,
  viewport: string
) {
  // read slice number and number of lines for current slice, then remove from array
  let sliceNumber = slicePoints[0];
  let numberOfLines = slicePoints[1];

  try {
    slicePoints = slicePoints.subarray(2);
  } catch (err) {
    slicePoints = slicePoints.slice(2);
  }

  let numberOfPoints = 0;
  contours[viewport][segmentationName][sliceNumber] = {
    lines: [] as vec2[][]
  };

  if (numberOfLines) {
    // for each line
    each(range(numberOfLines), function (l: number) {
      // get number of points for current line
      let numberOfPointsPerLine = slicePoints[0];
      // compute coordinates size
      let lineCoordSize = numberOfPointsPerLine * pointBatchSize;

      // remove numberOfPointsPerLine and the coordinates for this line
      let subCoords;
      try {
        subCoords = slicePoints.subarray(1, lineCoordSize + 1);
      } catch (err) {
        subCoords = slicePoints.slice(1, lineCoordSize + 1);
      }
      populateContoursObject(
        pointBatchSize,
        contours,
        l,
        sliceNumber,
        segmentationName,
        viewport,
        subCoords
      );

      let lineSize = 1 + lineCoordSize;
      numberOfPoints += lineSize;
      try {
        slicePoints = slicePoints.subarray(lineSize);
      } catch (err) {
        slicePoints = slicePoints.slice(lineSize);
      }
    });
  }

  return 2 + numberOfPoints;
};
