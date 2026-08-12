/**
 * Ephemeral, non-persisted UI selection state shared across views
 * (e.g. which role family/career stage is currently selected). This is
 * intentionally separate from the persisted application Store because it
 * is not part of the exported schema.
 */
(function (global) {
  'use strict';

  function UiState(initial) {
    this.state = Object.assign({
      selectedRoleFamilyId: null,
      selectedCareerStageId: null,
      capabilityMapDomainId: null
    }, initial || {});
    this.listeners = [];
  }

  UiState.prototype.getState = function () { return this.state; };

  UiState.prototype.setState = function (patch) {
    this.state = Object.assign({}, this.state, patch);
    this.listeners.slice().forEach(function (listener) { listener(this.state); }.bind(this));
  };

  UiState.prototype.subscribe = function (listener) {
    this.listeners.push(listener);
    var self = this;
    return function () {
      var idx = self.listeners.indexOf(listener);
      if (idx !== -1) { self.listeners.splice(idx, 1); }
    };
  };

  global.RCF = global.RCF || {};
  global.RCF.core = global.RCF.core || {};
  global.RCF.core.UiState = UiState;
})(window);
