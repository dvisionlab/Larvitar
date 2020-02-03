// external libraries
import { each, range } from "lodash"; // TODO import just what needed

// -------------------------------------
// Populate the contour object with data
// -------------------------------------
function populateContoursObject(
  pointBatchSize,
  contours,
  lineNumber,
  sliceNumber,
  segmentationName,
  orientation,
  data
) {
  var coords = [];

  for (var i = 0; i < data.length; i += pointBatchSize) {
    var xy = data.slice(i, pointBatchSize + i);

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
}

// ------------------------------------------------
// Extract each slice points from global data array
// ------------------------------------------------
function extractSlicePoints(
  contours,
  pointBatchSize,
  slicePoints,
  segmentationName,
  orientation
) {
  // read slice number and number of lines for current slice, then remove from array
  var sliceNumber = slicePoints[0];
  var numberOfLines = slicePoints[1];

  try {
    slicePoints = slicePoints.subarray(2);
  } catch (err) {
    slicePoints = slicePoints.slice(2);
  }

  var numberOfPoints = 0;
  contours[orientation][segmentationName][sliceNumber] = {
    lines: []
  };

  if (numberOfLines) {
    // for each line
    each(range(numberOfLines), function(l) {
      // get number of points for current line
      var numberOfPointsPerLine = slicePoints[0];
      // compute coordinates size
      var lineCoordSize = numberOfPointsPerLine * pointBatchSize;

      // remove numberOfPointsPerLine and the coordinates for this line
      var subCoords;
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

      var lineSize = 1 + lineCoordSize;
      numberOfPoints += lineSize;
      try {
        slicePoints = slicePoints.subarray(lineSize);
      } catch (err) {
        slicePoints = slicePoints.slice(lineSize);
      }
    });
  }

  return 2 + numberOfPoints;
}

// --------------------------------------
// Parse contour object for each viewport
// --------------------------------------
export function parseContours(
  contoursData,
  pointBatchSize,
  segmentationName,
  _viewports
) {
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];

  var contours = {
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
    var points = contoursData[orientation];

    if (!points) {
      return;
    }

    var numberOfSlices = points[0];
    points = points.slice(1);

    each(range(numberOfSlices), function() {
      var sliceSize = extractSlicePoints(
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
}
