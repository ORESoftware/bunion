'use strict';

export const customStringify = function (v: object) {
  let cache = new Map<any, true>();
  return JSON.stringify(v, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.get(value) === true) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.set(value, true);
    }
    return value;
  });
};