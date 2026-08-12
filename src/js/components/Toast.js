/**
 * Toast notification component (NFR-004). Small, auto-dismissing status
 * messages for successful actions such as create/import/export/reset.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;

  function Toast() {
    this.container = null;
  }

  Toast.prototype.mount = function (container) {
    this.container = container;
  };

  /** @param {string} message @param {'success'|'error'|'info'} [type] */
  Toast.prototype.show = function (message, type) {
    if (!this.container) { return; }
    type = type || 'info';
    var node = el('div', { className: 'toast toast-' + type, role: 'status' }, [
      el('span', { className: 'toast-message', text: message })
    ]);
    this.container.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('toast-visible'); });
    setTimeout(function () {
      node.classList.remove('toast-visible');
      setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 300);
    }, 3400);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.Toast = Toast;
})(window);
