/** @module monitors/performance
 *  @desc This file provides utility functions for
 *        monitoring performance usage
 */

var PERFORMANCE_MONITOR = false;

/**
 * Get performance monitor
 * @instance
 * @function getPerformanceMonitor
 * @returns {Boolean} - Performance monitor status
 */
export const getPerformanceMonitor = function () {
  return PERFORMANCE_MONITOR;
};

/**
 * Set performance monitor ON
 * @instance
 * @function activatePerformanceMonitor
 */
export const activatePerformanceMonitor = function () {
  PERFORMANCE_MONITOR = true;
};

/**
 * Set performance monitor OFF
 * @instance
 * @function deactivatePerformanceMonitor
 */
export const deactivatePerformanceMonitor = function () {
  PERFORMANCE_MONITOR = false;
};
