/**
 * Persistent left navigation (compact drawer on narrow screens via CSS +
 * AppShell's toggle). Uses real anchor links so the browser's native hash
 * navigation and keyboard support work without extra plumbing.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;

  var VIEW_LABELS = {
    'dashboard': 'Dashboard',
    'capability-map': 'Capability Map',
    'framework': 'Framework Builder',
    'roles': 'Roles',
    'mappings': 'Mappings'
  };

  function Navigation() {
    this.root = null;
    this.currentView = 'dashboard';
  }

  Navigation.prototype.mount = function (container) {
    this.root = el('nav', { className: 'app-nav', 'aria-label': 'Primary' });
    container.appendChild(this.root);
    this.renderLinks();
  };

  Navigation.prototype.renderLinks = function () {
    if (!this.root) { return; }
    clear(this.root);
    var self = this;
    var list = el('ul', { className: 'nav-list' });
    global.RCF.core.VALID_VIEWS.forEach(function (view) {
      var isActive = view === self.currentView;
      var li = el('li', { className: 'nav-item' }, [
        el('a', {
          className: 'nav-link' + (isActive ? ' active' : ''),
          href: '#' + view,
          'aria-current': isActive ? 'page' : null,
          text: VIEW_LABELS[view]
        })
      ]);
      list.appendChild(li);
    });
    this.root.appendChild(list);
  };

  Navigation.prototype.setActiveView = function (view) {
    this.currentView = view;
    this.renderLinks();
  };

  Navigation.prototype.destroy = function () {};

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.Navigation = Navigation;
})(window);
