/**
 * Role progression heatmap (FR-071). Implemented as a semantic HTML table
 * with CSS-driven colour intensity so it remains accessible (real
 * row/column headers) while still satisfying the "native SVG/CSS" chart
 * constraint. Colour is never the only signal - every cell also has text.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;

  function hexToRgb(hex) {
    hex = String(hex || '#3659d9').replace('#', '');
    if (hex.length === 3) { hex = hex.split('').map(function (c) { return c + c; }).join(''); }
    var num = parseInt(hex, 16) || 0x3659d9;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  /** Blends white -> domain colour by intensity (0-1), returning css colour + a readable text colour. */
  function intensityToColours(hex, intensity) {
    var target = hexToRgb(hex);
    var minIntensity = 0.15;
    var t = minIntensity + Math.max(0, Math.min(1, intensity)) * (1 - minIntensity);
    var r = Math.round(255 + (target.r - 255) * t);
    var g = Math.round(255 + (target.g - 255) * t);
    var b = Math.round(255 + (target.b - 255) * t);
    var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return { background: 'rgb(' + r + ',' + g + ',' + b + ')', text: luminance > 140 ? '#172033' : '#ffffff' };
  }

  /**
   * @param {HTMLElement} container
   * @param {object} opts
   *   domains: [{ id, name, colour }]
   *   columns: [{ id, label }]
   *   getCell: function(domainId, columnId) -> { value: 0-100, levelLabel, notSet, inferred }
   *   title: string
   */
  function render(container, opts) {
    clear(container);
    var domains = opts.domains || [];
    var columns = opts.columns || [];

    if (!domains.length || !columns.length) {
      container.appendChild(el('p', { className: 'empty-note', text: 'Add domains and career stages to see the progression heatmap.' }));
      return;
    }

    var wrap = el('div', { className: 'heatmap-wrap' });
    var scroll = el('div', { className: 'heatmap-scroll' });
    var table = el('table', { className: 'heatmap-table' }, [
      el('caption', { className: 'sr-only', text: opts.title || 'Role progression heatmap' })
    ]);

    var headRow = el('tr', {}, [el('th', { scope: 'col', className: 'heatmap-corner', text: 'Domain' })]);
    columns.forEach(function (col) { headRow.appendChild(el('th', { scope: 'col', text: col.label })); });
    table.appendChild(el('thead', {}, [headRow]));

    var tbody = el('tbody');
    domains.forEach(function (domain) {
      var row = el('tr', {}, [el('th', { scope: 'row', className: 'heatmap-row-head', text: domain.name })]);
      columns.forEach(function (col) {
        var cellData = (opts.getCell && opts.getCell(domain.id, col.id)) || { notSet: true };
        var td;
        if (cellData.notSet) {
          td = el('td', { className: 'heatmap-cell heatmap-cell-notset', text: 'Not set' });
        } else {
          var colours = intensityToColours(domain.colour, (cellData.value || 0) / 100);
          td = el('td', {
            className: 'heatmap-cell' + (cellData.inferred ? ' heatmap-cell-inferred' : ''),
            style: { backgroundColor: colours.background, color: colours.text },
            text: cellData.levelLabel || ''
          });
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    wrap.appendChild(scroll);

    wrap.appendChild(el('p', { className: 'heatmap-legend-note', text: 'Darker shading = higher maturity target within each domain\u2019s colour. Striped cells are Not Set. Inferred cells are marked with an asterisk.' }));

    container.appendChild(wrap);
  }

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.Heatmap = { render: render };
})(window);
