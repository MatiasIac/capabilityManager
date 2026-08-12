/**
 * ID generation helpers.
 * IDs are immutable and must never be derived from user-visible names,
 * because users can rename entities at any time.
 */
(function (global) {
  'use strict';

  var counter = 0;

  /**
   * Generates a reasonably unique id, using crypto.randomUUID() when
   * available and falling back to a timestamp + counter + random suffix
   * for older browsers.
   * @param {string} [prefix] optional short prefix for readability in exports.
   * @returns {string}
   */
  function generateId(prefix) {
    var raw;
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      raw = global.crypto.randomUUID();
    } else {
      counter += 1;
      raw = Date.now().toString(36) + '-' + counter.toString(36) + '-' +
        Math.random().toString(36).slice(2, 10);
    }
    return prefix ? (prefix + '-' + raw) : raw;
  }

  global.RCF = global.RCF || {};
  global.RCF.utils = global.RCF.utils || {};
  global.RCF.utils.generateId = generateId;
})(window);
