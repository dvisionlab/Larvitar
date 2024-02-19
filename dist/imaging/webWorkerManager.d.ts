declare namespace _default {
    export { initialize };
    export { loadWebWorkerTask };
    export { addTask };
    export { getStatistics };
    export { setTaskPriority };
    export { cancelTask };
    export { webWorkers };
    export { terminate };
}
export default _default;
/**
 * Initialization function for the web worker manager - spawns web workers
 * @param configObject
 */
declare function initialize(configObject: any): void;
/**
 * dynamically loads a web worker task
 * @param sourcePath
 * @param taskConfig
 */
declare function loadWebWorkerTask(sourcePath: any, taskConfig: any): void;
/**
 * Function to add a decode task to be performed
 *
 * @param taskType - the taskType for this task
 * @param data - data specific to the task
 * @param priority - optional priority of the task (defaults to 0), > 0 is higher, < 0 is lower
 * @param transferList - optional array of data to transfer to web worker
 * @returns {*}
 */
declare function addTask(taskType: any, data: any, priority: number | undefined, transferList: any): any;
/**
 * Function to return the statistics on running web workers
 * @returns object containing statistics
 */
declare function getStatistics(): {
    maxWebWorkers: number;
    numWebWorkers: number;
    numTasksQueued: number;
    numTasksExecuting: number;
    numTasksCompleted: number;
    totalTaskTimeInMS: number;
    totalTimeDelayedInMS: number;
};
/**
 * Changes the priority of a queued task
 * @param taskId - the taskId to change the priority of
 * @param priority - priority of the task (defaults to 0), > 0 is higher, < 0 is lower
 * @returns boolean - true on success, false if taskId not found
 */
declare function setTaskPriority(taskId: any, priority?: number): boolean;
/**
 * Cancels a queued task and rejects
 * @param taskId - the taskId to cancel
 * @param reason - optional reason the task was rejected
 * @returns boolean - true on success, false if taskId not found
 */
declare function cancelTask(taskId: any, reason: any): boolean;
declare const webWorkers: any[];
/**
 * Terminate all running web workers.
 */
declare function terminate(): void;
