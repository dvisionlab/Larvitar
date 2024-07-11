/**
 * Scissors
 *
 * Ref: Eric N. Mortensen, William A. Barrett, Interactive Segmentation with
 *   Intelligent Scissors, Graphical Models and Image Processing, Volume 60,
 *   Issue 5, September 1998, Pages 349-384, ISSN 1077-3169,
 *   DOI: 10.1006/gmip.1998.0480.
 *
 * {@link http://www.sciencedirect.com/science/article/B6WG4-45JB8WN-9/2/6fe59d8089fd1892c2bfb82283065579}
 *
 * Implementation based on MIT licensed code at:
 * {@link http://code.google.com/p/livewire-javascript/}
 */
export declare class LivewireScissors {
    private searchGranularityBits;
    private searchGranularity;
    /** Width of the image */
    readonly width: number;
    /** Height of the image */
    readonly height: number;
    /** Grayscale image */
    private grayscalePixelData;
    private laplace;
    /** Gradient vector magnitude for each pixel */
    private gradMagnitude;
    /** Gradient of each pixel in the x-direction */
    private gradXNew;
    /** Gradient of each pixel in the y-direction */
    private gradYNew;
    /** Dijkstra - start point */
    private startPoint?;
    /** Dijkstra - store the state of a pixel (visited/unvisited) */
    private visited;
    /** Dijkstra - map a point to its parent along the shortest path to root (start point) */
    private parents;
    /** Dijkstra - store the cost to go from the start point to each node */
    private costs;
    /** Dijkstra - BucketQueue to sort items by priority */
    private priorityQueueNew?;
    constructor(grayscalePixelData: number[], width: number, height: number);
    startSearch(startPoint: [number, number]): void;
    /**
     * Finds a nearby point with a minimum cost nearby
     *
     * @param testPoint - to look nearby
     * @param delta - how long a distance to look
     * @returns A point having the minimum weighted distance from the testPoint
     */
    findMinNearby(testPoint: [number, number], delta?: number): [number, number];
    /**
     * Runs Dijsktra until it finds a path from the start point to the target
     * point. Once it reaches the target point all the state is preserved in order
     * to save processing time the next time the method is called for a new target
     * point. The search is restarted whenever `startSearch` is called.
     * @param targetPoint - Target point
     * @returns An array with all points for the shortest path found that goes
     * from startPoint to targetPoint.
     */
    findPathToPoint(targetPoint: [number, number]): [number, number][];
    /**
     * Convert a point coordinate (x,y) into a point index
     * @param index - Point index
     * @returns Point coordinate (x,y)
     */
    private _getPointIndex;
    /**
     * Convert a point index into a point coordinate (x,y)
     * @param index - Point index
     * @returns Point coordinate (x,y)
     */
    private _getPointCoordinate;
    /**
     * Calculate the delta X between a given point and its neighbor at the right
     * @param x - Point x-coordinate
     * @param y - Point y-coordinate
     * @returns Delta Y between the given point and its neighbor at the right
     */
    private _getDeltaX;
    /**
     * Calculate the delta Y between a given point and its neighbor at the bottom
     * @param x - Point x-coordinate
     * @param y - Point y-coordinate
     * @returns Delta Y between the given point and its neighbor at the bottom
     */
    private _getDeltaY;
    private _getGradientMagnitude;
    /**
     *  Calculate the Laplacian of Gaussian (LoG) value for a given pixel
     *
     *     Kernel Indexes           Laplacian of Gaussian Kernel
     *   __  __  02  __  __              0   0   1   0   0
     *   __  11  12  13  __              0   1   2   1   0
     *   20  21  22  23  24              1   2 -16   2   1
     *   __  31  32  33  __              0   1   2   1   0
     *   __  __  42  __  __              0   0   1   0   0
     */
    private _getLaplace;
    /**
     * Returns a 2D array of gradient magnitude values for grayscale. The values
     * are scaled between 0 and 1, and then flipped, so that it works as a cost
     * function.
     * @returns A gradient object
     */
    private _computeGradient;
    /**
     * Returns a 2D array of Laplacian of Gaussian values
     *
     * @param grayscale - The input grayscale
     * @returns A laplace object
     */
    private _computeLaplace;
    /**
     * Returns 2D array of x-gradient values for grayscale
     *
     * @param grayscale - Grayscale pixel data
     * @returns 2D x-gradient array
     */
    private _computeGradientX;
    /**
     * Compute the Y gradient.
     *
     * @param grayscale - Grayscale pixel data
     * @returns 2D array of y-gradient values for grayscale
     */
    private _computeGradientY;
    /**
     * Compute the gradient unit vector.
     * @param px - Point x-coordinate
     * @param py - Point y-coordinate
     * @returns Gradient vector at (px, py), scaled to a magnitude of 1
     */
    private _getGradientUnitVector;
    /**
     * Compute the gradient direction, in radians, between two points
     *
     * @param px - Point `p` x-coordinate of point p.
     * @param py - Point `p` y-coordinate of point p.
     * @param qx - Point `q` x-coordinate of point q.
     * @param qy - Point `q` y-coordinate of point q.
     * @returns Gradient direction
     */
    private _getGradientDirection;
    /** Gets the cost to go from A to B */
    getCost(pointA: [number, number], pointB: [number, number]): number;
    /**
     * Return a weighted distance between two points
     */
    private _getWeightedDistance;
    /**
     * Get up to 8 neighbors points
     * @param point - Reference point
     * @returns Up to eight neighbor points
     */
    private _getNeighborPoints;
    private _getPointCost;
    /**
     * Create a livewire scissor instance from RAW pixel data
     * @param pixelData - Raw pixel data
     * @param width - Width of the image
     * @param height - Height of the image
     * @param voiRange - VOI Range
     * @returns A LivewireScissors instance
     */
    static createInstanceFromRawPixelData(pixelData: Float32Array, width: number, height: number, voiRange: {
        lower: number;
        upper: number;
    }): LivewireScissors;
}
