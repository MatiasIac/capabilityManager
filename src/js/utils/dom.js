/**
 * Small DOM helper utilities shared by all components.
 *
 * IMPORTANT: user-entered text must always be passed as plain strings to
 * `el()`/`text()` (which use textContent) - never build HTML strings by
 * concatenating user data and assigning to innerHTML.
 */
(function (global) {
  'use strict';

  /**
   * Creates a DOM element.
   * @param {string} tag e.g. 'div', 'button'
   * @param {object} [attrs] attributes/properties. Special keys:
   *   - className: string
   *   - text: string (safely assigned via textContent)
   *   - html: TRUSTED static markup only (never user content)
   *   - dataset: object of data-* values
   *   - on: object of eventName -> handler
   *   - style: object of CSS properties
   * @param {Array<Node|string>} [children]
   * @returns {HTMLElement}
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null) { return; }
      if (key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        // Only ever used for trusted, static, developer-authored markup.
        node.innerHTML = value;
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (dk) { node.dataset[dk] = value[dk]; });
      } else if (key === 'on') {
        Object.keys(value).forEach(function (evt) { node.addEventListener(evt, value[evt]); });
      } else if (key === 'style') {
        Object.keys(value).forEach(function (sk) { node.style[sk] = value[sk]; });
      } else if (key === 'for') {
        node.setAttribute('for', value);
      } else if (typeof value === 'boolean') {
        if (value) { node.setAttribute(key, ''); }
        if (key in node) { node[key] = value; }
      } else {
        node.setAttribute(key, value);
      }
    });
    (children || []).forEach(function (child) {
      appendChild(node, child);
    });
    return node;
  }

  function appendChild(node, child) {
    if (child === undefined || child === null || child === false) { return; }
    if (Array.isArray(child)) {
      child.forEach(function (c) { appendChild(node, c); });
      return;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }

  /** Removes all children from a node. */
  function clear(node) {
    while (node.firstChild) { node.removeChild(node.firstChild); }
  }

  /**
   * Event delegation helper: listens on `root` for `eventType` bubbling
   * from any descendant matching `selector`.
   */
  function delegate(root, eventType, selector, handler) {
    var listener = function (evt) {
      var target = evt.target;
      while (target && target !== root) {
        if (target.matches && target.matches(selector)) {
          handler(evt, target);
          return;
        }
        target = target.parentNode;
      }
    };
    root.addEventListener(eventType, listener);
    return function () { root.removeEventListener(eventType, listener); };
  }

  /** Formats an ISO date string as a short human-readable date/time. */
  function formatDate(iso) {
    if (!iso) { return ''; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /** Blurs a text input on Enter so a 'change' handler commits the edit without submitting any form. */
  function commitOnEnter(input) {
    input.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter') { evt.preventDefault(); input.blur(); }
    });
    return input;
  }

  /** Debounces a function call. */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Captures focus/selection state of an in-container input marked with
   * `data-focus-key` before a full re-render, so live-filtering search boxes
   * (which use 'input' rather than 'change') don't lose focus/cursor position
   * on every keystroke once the container is rebuilt. Use with restoreFocus().
   */
  function captureFocus(container) {
    var active = document.activeElement;
    if (!active || !container || !container.contains(active)) { return null; }
    var key = active.getAttribute && active.getAttribute('data-focus-key');
    if (!key) { return null; }
    var snapshot = { key: key };
    if (typeof active.selectionStart === 'number') {
      snapshot.start = active.selectionStart;
      snapshot.end = active.selectionEnd;
    }
    return snapshot;
  }

  /** Restores focus/selection captured by captureFocus() after rebuilding `container`. */
  function restoreFocus(container, snapshot) {
    if (!snapshot) { return; }
    var node = container.querySelector('[data-focus-key="' + snapshot.key + '"]');
    if (!node) { return; }
    node.focus();
    if (typeof snapshot.start === 'number' && node.setSelectionRange) {
      try { node.setSelectionRange(snapshot.start, snapshot.end); } catch (e) { /* not a text-selectable input */ }
    }
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** Creates a namespaced SVG element with attributes (used by chart components). */
  function svgEl(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null) { return; }
      if (key === 'text') { node.textContent = value; return; }
      node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) { if (child) { node.appendChild(child); } });
    return node;
  }

  global.RCF = global.RCF || {};
  global.RCF.utils = global.RCF.utils || {};
  global.RCF.utils.el = el;
  global.RCF.utils.clear = clear;
  global.RCF.utils.delegate = delegate;
  global.RCF.utils.formatDate = formatDate;
  global.RCF.utils.commitOnEnter = commitOnEnter;
  global.RCF.utils.debounce = debounce;
  global.RCF.utils.clamp = clamp;
  global.RCF.utils.captureFocus = captureFocus;
  global.RCF.utils.restoreFocus = restoreFocus;
  global.RCF.utils.svgEl = svgEl;
})(window);
