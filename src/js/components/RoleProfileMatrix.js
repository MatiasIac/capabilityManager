/**
 * Domain target matrix (FR-060): rows are domains, columns are career
 * stages, each cell is a compact level select. Also surfaces non-blocking
 * progression warnings (FR-064) when a later stage's target drops below an
 * earlier stage's target for the same domain.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var calc = global.RCF.calculations;

  function RoleProfileMatrix(services) {
    this.services = services;
    this.container = null;
  }

  RoleProfileMatrix.prototype.mount = function (container) { this.container = container; };
  RoleProfileMatrix.prototype.destroy = function () { this.container = null; };

  RoleProfileMatrix.prototype.render = function (state, roleFamily) {
    if (!this.container) { return; }
    clear(this.container);
    var services = this.services;
    var section = el('div', { className: 'card' });
    section.appendChild(el('h3', { text: 'Domain target matrix' }));

    if (!roleFamily) {
      section.appendChild(el('p', { className: 'empty-note', text: 'Select or create a role family to edit its domain target matrix.' }));
      this.container.appendChild(section);
      return;
    }

    var domains = calc.getSortedDomains(state);
    var stages = calc.getSortedCareerStages(roleFamily);
    var levels = calc.getSortedLevels(state);

    if (!domains.length || !stages.length) {
      section.appendChild(el('p', { className: 'empty-note', text: 'Add at least one domain (Framework Builder) and one career stage to use this matrix.' }));
      this.container.appendChild(section);
      return;
    }

    section.appendChild(el('p', { className: 'text-muted', text: 'Set a target level per domain/stage cell. This is the fastest way to sketch a whole career ladder.' }));

    var scrollWrap = el('div', { className: 'matrix-scroll' });
    var table = el('div', { className: 'matrix-table', role: 'table', 'aria-label': 'Domain target matrix for ' + roleFamily.name });

    var headerRow = el('div', { className: 'matrix-row matrix-header-row', role: 'row' });
    headerRow.appendChild(el('span', { className: 'matrix-corner', role: 'columnheader', text: 'Domain \\ Stage' }));
    stages.forEach(function (s) { headerRow.appendChild(el('span', { className: 'matrix-col-header', role: 'columnheader', text: s.shortTitle || s.title })); });
    table.appendChild(headerRow);

    domains.forEach(function (domain) {
      var row = el('div', { className: 'matrix-row', role: 'row', style: { '--domain-colour': domain.colour } });
      row.appendChild(el('span', { className: 'matrix-row-header', role: 'rowheader', text: domain.name }));
      stages.forEach(function (stage) {
        var profile = calc.getRoleProfile(roleFamily.id, stage.id, state);
        var select = el('select', {
          className: 'input matrix-cell-select', 'aria-label': domain.name + ' target at ' + stage.title
        }, [el('option', { value: '', text: 'Not Set' })].concat(levels.map(function (l) { return el('option', { value: l.id, text: l.shortLabel || l.name }); })));
        select.value = (profile && profile.domainTargets && profile.domainTargets[domain.id]) || '';
        select.addEventListener('change', function () {
          services.store.dispatch({
            type: 'ROLE_PROFILE_SET_DOMAIN_TARGET',
            payload: { roleFamilyId: roleFamily.id, careerStageId: stage.id, domainId: domain.id, levelId: select.value || null }
          });
        });
        row.appendChild(el('span', { role: 'cell', className: 'matrix-cell' }, [select]));
      });
      table.appendChild(row);
    });
    scrollWrap.appendChild(table);
    section.appendChild(scrollWrap);

    var warnings = [];
    domains.forEach(function (domain) {
      var prev = null;
      stages.forEach(function (stage) {
        var profile = calc.getRoleProfile(roleFamily.id, stage.id, state);
        var levelId = profile && profile.domainTargets ? profile.domainTargets[domain.id] : null;
        var level = levelId ? calc.getLevelById(levelId, state) : null;
        if (level && prev && level.order < prev.level.order) {
          warnings.push(domain.name + ' drops from ' + prev.level.name + ' at ' + prev.stage.title + ' to ' + level.name + ' at ' + stage.title + '.');
        }
        if (level) { prev = { stage: stage, level: level }; }
      });
    });
    if (warnings.length) {
      section.appendChild(el('div', { className: 'warning-banner-list' }, [
        el('p', { className: 'warning-banner-title', text: '\u26A0 Progression warnings (informational only \u2014 unusual paths may be intentional):' }),
        el('ul', { className: 'warning-list' }, warnings.map(function (w) { return el('li', { text: w }); }))
      ]));
    }

    this.container.appendChild(section);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.RoleProfileMatrix = RoleProfileMatrix;
})(window);
