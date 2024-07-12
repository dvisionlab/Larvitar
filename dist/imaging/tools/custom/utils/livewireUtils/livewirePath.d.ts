/**
 * Path that contains points and control points to draw a path
 * used by the livewire tool
 */
export declare class LivewirePath {
    /**
     * List of points.
     */
    pointArray: [number, number][];
    /**
     * List of control points indexes
     */
    private _controlPointIndexes;
    /**
     * @param inputPointArray - The list of Point2D that make the path (optional).
     * @param inputControlPointIndexArray - The list of control point of path, as indexes (optional).
     *   Note: first and last point do not need to be equal.
     */
    constructor(inputPointArray?: [number, number][], inputControlPointIndexArray?: number[]);
    /**
     * Get a point of the list.
     *
     * @param index - The index of the point to get
     * @returns The Point2D at the given index.
     */
    getPoint(index: number): [number, number];
    /**
     * Get the last point of the list.
     *
     * @returns The last point of the list.
     */
    getLastPoint(): [number, number];
    /**
     * Is the given point a control point.
     *
     * @param point - The 2D point to check.
     * @returns True if a control point, false otherwise.
     */
    isControlPoint(point: [number, number]): boolean;
    /**
     * Add a point to the path.
     *
     * @param point - The 2D point to add.
     */
    addPoint(point: [number, number]): void;
    /**
     * Add a control point to the path.
     *
     * @param point - The 2D point to make a control point.
     */
    addControlPoint(point: [number, number]): void;
    getControlPoints(): [number, number][];
    getPoints(): [number, number][];
    getNumControlPoints(): number;
    removeLastControlPoint(): void;
    getLastControlPoint(): [number, number] | undefined;
    removeLastPoints(count: number): void;
    /**
     * Add points to the path.
     *
     * @param newPointArray - The list of 2D points to add.
     */
    addPoints(newPointArray: [number, number][]): void;
    /**
     * Prepend a path to this one.
     *
     * @param other - The path to append.
     */
    prependPath(other: LivewirePath): void;
    /**
     * Append a path to this one.
     *
     * @param other - The path to append.
     */
    appendPath(other: LivewirePath): void;
}
