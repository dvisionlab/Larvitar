
function isPointInPolygon(point, vs) {
    const x = point[0];
    const y = point[1];
    let inside = false;
  
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0];
      const yi = vs[i][1];
  
      const xj = vs[j][0];
      const yj = vs[j][1];
  
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
  
      if (intersect) {
        inside = !inside;
      }
    }
  
    return inside;
  }
function getBoundingBoxAroundPolygon(vertices, image) {
    let xMin = Infinity;
    let xMax = 0;
    let yMin = Infinity;
    let yMax = 0;
    const { width, height } = image;
  
    vertices.forEach(v => {
      xMin = Math.min(v[0], xMin);
      xMax = Math.max(v[0], xMax);
      yMin = Math.min(v[1], yMin);
      yMax = Math.max(v[1], yMax);
    });
  
    xMin = Math.floor(xMin);
    yMin = Math.floor(yMin);
    xMax = Math.floor(xMax);
    yMax = Math.floor(yMax);
  
    xMax = Math.min(width, xMax);
    xMin = Math.max(0, xMin);
    yMax = Math.min(height, yMax);
    yMin = Math.max(0, yMin);
  
    return [[xMin, yMin], [xMax, yMax]];
  }
  function fillShape(
    evt,
    operationData,
    pointInShape,
    topLeft,
    bottomRight,
    insideOrOutside = 'inside'
  ) {
    const { pixelData, segmentIndex } = operationData;
console.log(pixelData)
  
    const { width } = evt.detail.image;
    const [xMin, yMin] = topLeft;
    const [xMax, yMax] = bottomRight;
  
    if (insideOrOutside === 'outside') {
      fillOutsideBoundingBox(evt, operationData, topLeft, bottomRight);
    }
  
    for (let x = xMin; x < xMax; x++) {
      for (let y = yMin; y < yMax; y++) {
        const pixelIndex = y * width + x;
  
        // If the pixel is the same segmentIndex and is inside the
        // Region defined by the array of points, set their value to segmentIndex.
        if (
          pointInShape({
            x,
            y,
          })
        ) {
          pixelData[pixelIndex] = segmentIndex;
        }
      }
    }
  }
  
  /**
   * Fill all pixels labeled with the activeSegmentIndex,
   * inside the region defined by the shape.
   * @param  {Object} evt The Cornerstone event.
   * @param {Object}  operationData An object containing the `pixelData` to
   *                          modify, the `segmentIndex` and the `points` array.
   * @param {Object} pointInShape - A function that checks if a point, x,y is within a shape.
   * @param {number[]} topLeft The top left of the bounding box.
   * @param {number[]} bottomRight The bottom right of the bounding box.
   * @returns {null}
   */
  export function fillInsideShape(
    evt,
    operationData,
    pointInShape,
    topLeft,
    bottomRight
  ) {
    fillShape(evt, operationData, pointInShape, topLeft, bottomRight, 'inside');
  }
  
  function fillOutsideShape(
    evt,
    operationData,
    pointInShape,
    topLeft,
    bottomRight
  ) {
    fillShape(
      evt,
      operationData,
      point => !pointInShape(point),
      topLeft,
      bottomRight,
      'outside'
    );
  }
  function fillOutsideBoundingBox(
    evt,
    operationData,
    topLeft,
    bottomRight
  ) {
    const { pixelData, segmentIndex } = operationData;
    const { width, height } = evt.detail.image;
  
    // Loop until top of bounding box from top of image, color the entire row
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < topLeft[1]; j++) {
        pixelData[j * width + i] = segmentIndex;
      }
    }
  
    // Loop within rows of bounding box, to the left of the box
    for (let i = 0; i < topLeft[0]; i++) {
      for (let j = topLeft[1]; j < bottomRight[1]; j++) {
        pixelData[j * width + i] = segmentIndex;
      }
    }
  
    // Loop within rows of bounding box, to the right of the box
    for (let i = bottomRight[0]; i < width; i++) {
      for (let j = topLeft[1]; j < bottomRight[1]; j++) {
        pixelData[j * width + i] = segmentIndex;
      }
    }
  
    // Loop from bottom of bounding box until bottom of image, color entire row
    for (let i = 0; i < width; i++) {
      for (let j = bottomRight[1]; j < height; j++) {
        pixelData[j * width + i] = segmentIndex;
      }
    }
  }
/**
 * Fill all pixels inside/outside the region defined by
 * `operationData.points` with the `activeSegmentIndex` value.
 * @param  {} evt The Cornerstone event.
 * @param  {} operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function fillFreehand(evt, operationData, inside = true) {
  const { points } = operationData;


  // Obtain the bounding box of the entire drawing so that
  // we can subset our search. Outside of the bounding box,
  // everything is outside of the polygon.
  const { image } = evt.detail;
  const vertices = points.map(a => [a.x, a.y]);
  const [topLeft, bottomRight] = getBoundingBoxAroundPolygon(vertices, image);

  inside
    ? fillInsideShape(
        evt,
        operationData,
        point => isPointInPolygon([point.x, point.y], vertices),
        topLeft,
        bottomRight
      )
    : fillOutsideShape(
        evt,
        operationData,
        point => isPointInPolygon([point.x, point.y], vertices),
        topLeft,
        bottomRight
      );
}

/**
 * Fill all pixels inside/outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param {}  operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function fillInsideFreehand(evt, operationData) {
  fillFreehand(evt, operationData, true);
}

/**
 * Fill all pixels outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param  {} operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function fillOutsideFreehand(evt, operationData) {
  fillFreehand(evt, operationData, false);
}