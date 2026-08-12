/**
 * Reusable Modal/Confirm dialog component (NFR-006: no browser alert()).
 * Provides basic focus trapping and focus restoration (NFR-003).
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;

  var FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function Modal() {
    this.root = null;
    this.backdrop = null;
    this.dialog = null;
    this.lastFocused = null;
    this.keydownHandler = null;
    this.onCloseCallback = null;
  }

  Modal.prototype.mount = function (container) {
    this.root = container;
  };

  /**
   * @param {object} opts
   *   title: string
   *   bodyText: string (optional, rendered safely via textContent)
   *   bodyNode: Node (optional, additional custom content)
   *   actions: [{ label, variant, onClick }]
   *   onClose: function called when dismissed without an explicit action
   */
  Modal.prototype.open = function (opts) {
    var self = this;
    this.close();
    this.lastFocused = document.activeElement;
    this.onCloseCallback = opts.onClose || null;

    this.backdrop = el('div', { className: 'modal-backdrop', on: { click: function () { self.close(true); } } });
    var titleId = 'modal-title-' + Date.now();
    var bodyChildren = [];
    if (opts.bodyText) { bodyChildren.push(el('p', { text: opts.bodyText })); }
    if (opts.bodyNode) { bodyChildren.push(opts.bodyNode); }

    var actionsRow = el('div', { className: 'modal-actions' },
      (opts.actions || []).map(function (action) {
        return el('button', {
          type: 'button',
          className: 'btn ' + (action.variant ? 'btn-' + action.variant : 'btn-secondary'),
          text: action.label,
          on: { click: function () { action.onClick && action.onClick(); } }
        });
      })
    );

    this.dialog = el('div', {
      className: 'modal-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabIndex: '-1',
      on: { click: function (evt) { evt.stopPropagation(); } }
    }, [
      el('div', { className: 'modal-header' }, [
        el('h2', { id: titleId, className: 'modal-title', text: opts.title || '' }),
        el('button', {
          type: 'button', className: 'modal-close', 'aria-label': 'Close dialog', text: '\u00D7',
          on: { click: function () { self.close(true); } }
        })
      ]),
      el('div', { className: 'modal-body' }, bodyChildren),
      actionsRow
    ]);

    this.backdrop.appendChild(this.dialog);
    this.root.appendChild(this.backdrop);

    this.keydownHandler = function (evt) {
      if (evt.key === 'Escape') { self.close(true); return; }
      if (evt.key === 'Tab') { self.trapFocus(evt); }
    };
    document.addEventListener('keydown', this.keydownHandler);

    var focusTarget = this.dialog.querySelector(FOCUSABLE_SELECTOR) || this.dialog;
    focusTarget.focus();
  };

  Modal.prototype.trapFocus = function (evt) {
    if (!this.dialog) { return; }
    var focusable = Array.prototype.slice.call(this.dialog.querySelectorAll(FOCUSABLE_SELECTOR));
    if (!focusable.length) { return; }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (evt.shiftKey && document.activeElement === first) {
      evt.preventDefault();
      last.focus();
    } else if (!evt.shiftKey && document.activeElement === last) {
      evt.preventDefault();
      first.focus();
    }
  };

  /** Closes the modal. `dismissedWithoutAction` triggers the onClose callback (e.g. Escape/backdrop). */
  Modal.prototype.close = function (dismissedWithoutAction) {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    this.backdrop = null;
    this.dialog = null;
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus();
    }
    this.lastFocused = null;
    var cb = this.onCloseCallback;
    this.onCloseCallback = null;
    if (dismissedWithoutAction && cb) { cb(); }
  };

  /**
   * Convenience confirmation dialog used for all destructive actions (NFR-012).
   * @returns {Promise<boolean>} resolves true if confirmed, false otherwise.
   */
  Modal.prototype.confirm = function (opts) {
    var self = this;
    return new Promise(function (resolve) {
      var settled = false;
      var settle = function (value) { if (!settled) { settled = true; resolve(value); } };
      self.open({
        title: opts.title,
        bodyText: opts.message,
        bodyNode: opts.bodyNode,
        onClose: function () { settle(false); },
        actions: [
          { label: opts.cancelLabel || 'Cancel', variant: 'secondary', onClick: function () { settle(false); self.close(); } },
          { label: opts.confirmLabel || 'Confirm', variant: opts.danger ? 'danger' : 'primary', onClick: function () { settle(true); self.close(); } }
        ]
      });
    });
  };

  Modal.prototype.destroy = function () { this.close(); };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.Modal = Modal;
})(window);
