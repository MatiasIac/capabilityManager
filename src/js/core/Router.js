/**
 * Simple hash-based router. Switching views never reloads the page (the
 * SPA constraint from the spec) - it only updates location.hash and
 * notifies subscribers so AppShell can swap the visible view component.
 */
(function (global) {
  'use strict';

  var VALID_VIEWS = ['dashboard', 'capability-map', 'framework', 'roles', 'mappings'];
  var DEFAULT_VIEW = 'dashboard';

  function Router() {
    this.listeners = [];
    var self = this;
    global.addEventListener('hashchange', function () { self.notify(); });
  }

  Router.prototype.parseHash = function () {
    var raw = (global.location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    var view = parts[0] || DEFAULT_VIEW;
    if (VALID_VIEWS.indexOf(view) === -1) { view = DEFAULT_VIEW; }
    return { view: view, params: parts.slice(1) };
  };

  Router.prototype.navigate = function (view, params) {
    var hash = '#' + view + (params && params.length ? '/' + params.join('/') : '');
    if (global.location.hash === hash) {
      this.notify();
    } else {
      global.location.hash = hash;
    }
  };

  Router.prototype.subscribe = function (listener) {
    this.listeners.push(listener);
    var self = this;
    return function () {
      var idx = self.listeners.indexOf(listener);
      if (idx !== -1) { self.listeners.splice(idx, 1); }
    };
  };

  Router.prototype.notify = function () {
    var route = this.parseHash();
    this.listeners.slice().forEach(function (listener) { listener(route); });
  };

  Router.prototype.start = function () {
    this.notify();
  };

  global.RCF = global.RCF || {};
  global.RCF.core = global.RCF.core || {};
  global.RCF.core.Router = Router;
  global.RCF.core.VALID_VIEWS = VALID_VIEWS;
})(window);
