/**
 * localStorage persistence. Debounces writes (FR-091) and reports save
 * status via the EventBus so the header can show Saved/Saving/Error.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'roleCapabilityFrameworkPoc.v1';

  function Persistence(eventBus) {
    this.eventBus = eventBus;
    this.key = STORAGE_KEY;
    var self = this;
    this._debouncedSave = global.RCF.utils.debounce(function (state) { self._save(state); }, 300);
  }

  /** Loads previously saved state, or null if absent/corrupt. */
  Persistence.prototype.load = function () {
    try {
      var raw = global.localStorage.getItem(this.key);
      if (!raw) { return null; }
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  /** Schedules a debounced save and immediately reports "saving". */
  Persistence.prototype.scheduleSave = function (state) {
    if (this.eventBus) { this.eventBus.emit('save-status', 'saving'); }
    this._debouncedSave(state);
  };

  Persistence.prototype._save = function (state) {
    try {
      global.localStorage.setItem(this.key, JSON.stringify(state));
      if (this.eventBus) { this.eventBus.emit('save-status', 'saved'); }
    } catch (err) {
      if (this.eventBus) { this.eventBus.emit('save-status', 'error'); }
    }
  };

  global.RCF = global.RCF || {};
  global.RCF.core = global.RCF.core || {};
  global.RCF.core.Persistence = Persistence;
  global.RCF.core.STORAGE_KEY = STORAGE_KEY;
})(window);
