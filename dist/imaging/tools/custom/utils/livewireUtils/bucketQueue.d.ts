/**
 * Circular Bucket Queue.
 *
 * Returns input'd points in sorted order. All operations run in roughly O(1)
 * time (for input with small cost values), but it has a strict requirement:
 *
 * If the most recent point had a cost of c, any points added should have a cost
 * c' in the range c <= c' <= c + (capacity - 1).
 */
export declare class BucketQueue<T> {
    private _bucketCount;
    private _mask;
    private _size;
    private _currentBucketIndex;
    private _getPriority;
    private _areEqual;
    private _buckets;
    /**
     * @param bits - Number of bits.
     * @param getPriority - A function that returns the priority of an item
     */
    constructor({ numBits, getPriority, areEqual }: {
        numBits: number;
        getPriority?: (item: T) => number;
        areEqual?: (itemA: T, itemB: T) => boolean;
    });
    /**
     * Prepend item to the list in the appropriate bucket
     * @param item - Item to be added to the queue based on its priority
     */
    push(item: T): void;
    pop(): T;
    /**
     * Tries to remove item from queue.
     * @param item - Item to be removed from the queue
     * @returns True if the item is found and removed or false otherwise
     */
    remove(item: T): boolean;
    isEmpty(): boolean;
    /**
     * Return the bucket index
     * @param item - Item for which the bucket shall be returned
     * @returns Bucket index for the item provided
     */
    private _getBucketIndex;
    /**
     * Create array and initialze pointers to null
     * @param size - Size of the new array
     * @returns An array with `N` buckets pointing to null
     */
    private _buildArray;
}
