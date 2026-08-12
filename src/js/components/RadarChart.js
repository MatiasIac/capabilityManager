/**
 * Native SVG radar/spider chart (FR-070). Pure rendering - all scoring
 * math is done by js/utils/calculations.js and passed in as plain values.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var svgEl = global.RCF.utils.svgEl;

  function polarPoint(cx, cy, radius, angleDeg) {
    var rad = (Math.PI / 180) * angleDeg;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  /**
   * @param {HTMLElement} container
   * @param {object} opts
   *   axes: [{ id, label, colour }]  (max ~10 recommended - FR-070)
   *   values: { [axisId]: { value: 0-100, levelLabel: string, inferred: bool, notSet: bool } }
   *   size: number px
   *   title: string accessible chart title
   */
  function render(container, opts) {
    clear(container);
    var axes = opts.axes || [];
    var values = opts.values || {};
    var size = opts.size || 320;
    var cx = size / 2;
    var cy = size / 2;
    var maxRadius = size / 2 - 64;
    var n = axes.length;

    var wrap = el('div', { className: 'radar-chart-wrap' });

    if (!n) {
      wrap.appendChild(el('p', { className: 'empty-note', text: 'No domains available to plot yet.' }));
      container.appendChild(wrap);
      return;
    }

    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-labelledby': 'radar-title-' + Math.random().toString(36).slice(2) });
    var titleNode = svgEl('title', { text: opts.title || 'Capability radar chart' });
    svg.appendChild(titleNode);

    [0.25, 0.5, 0.75, 1].forEach(function (frac) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var angle = -90 + i * (360 / n);
        var p = polarPoint(cx, cy, maxRadius * frac, angle);
        pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
      }
      svg.appendChild(svgEl('polygon', { points: pts.join(' '), class: 'radar-grid-ring' }));
    });

    axes.forEach(function (axis, i) {
      var angle = -90 + i * (360 / n);
      var edge = polarPoint(cx, cy, maxRadius, angle);
      svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: edge.x.toFixed(1), y2: edge.y.toFixed(1), class: 'radar-axis-line' }));
      var labelPt = polarPoint(cx, cy, maxRadius + 22, angle);
      var cosVal = Math.cos(angle * Math.PI / 180);
      var anchor = Math.abs(cosVal) < 0.15 ? 'middle' : (cosVal > 0 ? 'start' : 'end');
      svg.appendChild(svgEl('text', { x: labelPt.x.toFixed(1), y: labelPt.y.toFixed(1), class: 'radar-axis-label', 'text-anchor': anchor, text: axis.label }));
    });

    var dataPts = [];
    var markers = [];
    axes.forEach(function (axis, i) {
      var angle = -90 + i * (360 / n);
      var v = values[axis.id] || { value: 0, notSet: true };
      var radius = maxRadius * (Math.max(0, Math.min(100, v.value || 0)) / 100);
      var p = polarPoint(cx, cy, radius, angle);
      dataPts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
      markers.push({ point: p, v: v });
    });
    svg.appendChild(svgEl('polygon', { points: dataPts.join(' '), class: 'radar-data-polygon' }));
    markers.forEach(function (m) {
      var classes = 'radar-data-point' + (m.v.inferred ? ' inferred' : '') + (m.v.notSet ? ' not-set' : '');
      svg.appendChild(svgEl('circle', { cx: m.point.x.toFixed(1), cy: m.point.y.toFixed(1), r: 4.5, class: classes }));
    });

    wrap.appendChild(svg);

    var list = el('ul', { className: 'radar-legend' });
    axes.forEach(function (axis) {
      var v = values[axis.id] || { notSet: true };
      var valueText = v.notSet ? 'Not set' : (v.levelLabel || '') + (v.inferred ? ' (inferred from overrides)' : '');
      list.appendChild(el('li', { className: 'radar-legend-item' }, [
        el('span', { className: 'legend-swatch', style: { backgroundColor: axis.colour || '#3659d9' } }),
        el('span', { className: 'radar-legend-label', text: axis.label + ':\u00A0' }),
        el('span', { className: 'radar-legend-value', text: valueText })
      ]));
    });
    wrap.appendChild(list);

    container.appendChild(wrap);
  }

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.RadarChart = { render: render };
})(window);
