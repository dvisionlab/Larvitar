/*
This file provides functionalities to render a set of points on a canvas.
Use this in order to render image contours (e.g. from binary masks).
*/

// external libraries
import { each, range } from "lodash";

/*
 * This module provides the following functions to be exported:
 * parseContours(contoursData,pointBatchSize,segmentationName, viewports)
 */

// =================================================================================
// Populate the contour object with data ===========================================
// pointBatchSize is default to 2 (how many points to render a segment) ============
// contours is the main contour tool object dict ===================================
// lineNumber is the number of line to be rendered (a contour is made of n lines) ==
// sliceNumber is the number of the slice in which the contour should be rendered ==
// segmentationName is the mask object name ========================================
// orientation represent the viewport (e.g. axial, coronal, sagittal) ==============
// data contains the array of pixel values =========================================
// =================================================================================
const populateContoursObject = function(
  pointBatchSize,
  contours,
  lineNumber,
  sliceNumber,
  segmentationName,
  orientation,
  data
) {
  let coords = [];

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

  contours[orientation][segmentationName][sliceNumber].lines[
    lineNumber
  ] = coords;
};

// ========================================================================
// Extract each slice points from global data array =======================
// contours is the main contour tool object dict ==========================
// pointBatchSize is default to 2 (how many points to render a segment) ===
// slicePoint is the number of contour points on a slice ==================
// segmentationName is the mask object name ===============================
// orientation represent the viewport (e.g. axial, coronal, sagittal) =====
// ========================================================================
const extractSlicePoints = function(
  contours,
  pointBatchSize,
  slicePoints,
  segmentationName,
  orientation
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
  contours[orientation][segmentationName][sliceNumber] = {
    lines: []
  };

  if (numberOfLines) {
    // for each line
    each(range(numberOfLines), function(l) {
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
        orientation,
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

// ===============================================================================
// Parse contour object for each viewport ========================================
// contoursData is the data array of the mask contour ============================
// pointBatchSize is default to 2 (how many points to render a segment) ==========
// segmentationName is the mask object name ======================================
// _viewports (optional) represent the viewport (e.g. axial, coronal, sagittal) ==
// ===============================================================================
export const parseContours = function(
  contoursData,
  pointBatchSize,
  segmentationName,
  _viewports
) {
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];

  let contours = {
    axial: {
      aorta: []
    },
    sagittal: {
      aorta: []
    },
    coronal: {
      aorta: []
    }
  };

  each(viewports, orientation => {
    let points = contoursData[orientation];

    if (!points) {
      return;
    }

    let numberOfSlices = points[0];
    points = points.slice(1);

    each(range(numberOfSlices), function() {
      let sliceSize = extractSlicePoints(
        contours,
        pointBatchSize,
        points,
        segmentationName,
        orientation
      );
      points = points.slice(sliceSize);
    });
  });

  return contours;
};
