/**
 * Path that contains points and control points to draw a path
 * used by the livewire tool
 */
export class LivewirePath {
  /**
   * List of points.
   */
  public pointArray: [number, number][];

  /**
   * List of control points indexes
   */
  private _controlPointIndexes: number[];

  /**
   * @param inputPointArray - The list of Point2D that make the path (optional).
   * @param inputControlPointIndexArray - The list of control point of path, as indexes (optional).
   *   Note: first and last point do not need to be equal.
   */
  constructor(
    inputPointArray?: [number, number][],
    inputControlPointIndexArray?: number[]
  ) {
    this.pointArray = inputPointArray ? inputPointArray.slice() : [];
    this._controlPointIndexes = inputControlPointIndexArray
      ? inputControlPointIndexArray.slice()
      : [];
  }

  /**
   * Get a point of the list.
   *
   * @param index - The index of the point to get
   * @returns The Point2D at the given index.
   */
  public getPoint(index: number): [number, number] {
    return this.pointArray[index];
  }

  /**
   * Get the last point of the list.
   *
   * @returns The last point of the list.
   */
  public getLastPoint(): [number, number] {
    return this.pointArray[this.pointArray.length - 1];
  }

  /**
   * Is the given point a control point.
   *
   * @param point - The 2D point to check.
   * @returns True if a control point, false otherwise.
   */
  public isControlPoint(point: [number, number]): boolean {
    const index = this.pointArray.indexOf(point);
    if (index !== -1) {
      return this._controlPointIndexes.indexOf(index) !== -1;
    } else {
      throw new Error("Error: isControlPoint called with not in list point.");
    }
  }

  /**
   * Add a point to the path.
   *
   * @param point - The 2D point to add.
   */
  public addPoint(point: [number, number]) {
    this.pointArray.push(point);
  }

  /**
   * Add a control point to the path.
   *
   * @param point - The 2D point to make a control point.
   */
  public addControlPoint(point: [number, number]) {
    const index = this.pointArray.indexOf(point);

    if (index !== -1) {
      this._controlPointIndexes.push(index);
    } else {
      throw new Error("Cannot mark a non registered point as control point.");
    }
  }

  public getControlPoints() {
    return this._controlPointIndexes.map(i => this.pointArray[i]);
  }
  public getPoints() {
    return this.pointArray;
  }
  public getNumControlPoints(): number {
    return this._controlPointIndexes.length;
  }

  public removeLastControlPoint(): void {
    if (this._controlPointIndexes.length) {
      this._controlPointIndexes.pop();
    }
  }

  public getLastControlPoint(): [number, number] | undefined {
    if (this._controlPointIndexes.length) {
      return this.pointArray[
        this._controlPointIndexes[this._controlPointIndexes.length - 1]
      ];
    }
  }

  public removeLastPoints(count: number) {
    this.pointArray.splice(this.pointArray.length - count, count);
  }

  /**
   * Add points to the path.
   *
   * @param newPointArray - The list of 2D points to add.
   */
  public addPoints(newPointArray: [number, number][]) {
    this.pointArray = this.pointArray.concat(newPointArray);
  }

  /**
   * Prepend a path to this one.
   *
   * @param other - The path to append.
   */
  public prependPath(other: LivewirePath): void {
    const otherSize = other.pointArray.length;
    const shiftedIndexArray: number[] = [];

    this.pointArray = other.pointArray.concat(this.pointArray);

    for (let i = 0; i < this._controlPointIndexes.length; ++i) {
      shiftedIndexArray[i] = this._controlPointIndexes[i] + otherSize;
    }

    this._controlPointIndexes =
      other._controlPointIndexes.concat(shiftedIndexArray);
  }

  /**
   * Append a path to this one.
   *
   * @param other - The path to append.
   */
  public appendPath(other: LivewirePath): void {
    this.addPoints(other.pointArray);
    other._controlPointIndexes.forEach(point =>
      this._controlPointIndexes.push(point)
    );
  }
}
