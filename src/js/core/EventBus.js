/**
 * Minimal publish/subscribe event bus for cross-cutting UI events that are
 * not part of application state (toasts, modal open/close requests, etc).
 * Application data changes should go through the Store instead.
 */
(function (global) {
  'use strict';

  function EventBus() {
    this.listeners = {};
  }

  EventBus.prototype.on = function (event, handler) {
    if (!this.listeners[event]) { this.listeners[event] = []; }
    this.listeners[event].push(handler);
    var self = this;
    return function () { self.off(event, handler); };
  };

  EventBus.prototype.off = function (event, handler) {
    var handlers = this.listeners[event];
    if (!handlers) { return; }
    var idx = handlers.indexOf(handler);
    if (idx !== -1) { handlers.splice(idx, 1); }
  };

  EventBus.prototype.emit = function (event, payload) {
    var handlers = this.listeners[event];
    if (!handlers) { return; }
    handlers.slice().forEach(function (handler) {
      try { handler(payload); } catch (err) {
        /* eslint-disable no-console */
        console.error('EventBus listener error for "' + event + '":', err);
      }
    });
  };

  global.RCF = global.RCF || {};
  global.RCF.core = global.RCF.core || {};
  global.RCF.core.EventBus = EventBus;
})(window);
