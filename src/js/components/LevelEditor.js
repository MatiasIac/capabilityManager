/**
 * Level management (FR-002, FR-003, FR-004). A simple ordered list with
 * inline-editable fields; edits commit on blur/Enter (never per keystroke)
 * so the full re-render triggered by a Store dispatch never steals focus
 * mid-type.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var commitOnEnter = global.RCF.utils.commitOnEnter;
  var calc = global.RCF.calculations;
  var validation = global.RCF.validation;

  /** Counts entities referencing a level, for the safe-delete confirmation (FR-004). */
  function countLevelReferences(levelId, state) {
    var domains = state.domains.filter(function (d) {
      return d.levelDescriptions && d.levelDescriptions[levelId] && String(d.levelDescriptions[levelId]).trim();
    }).length;
    var capabilities = state.capabilities.filter(function (c) {
      return (c.maturityDefinitions || []).some(function (def) { return def.levelId === levelId; });
    }).length;
    var profiles = state.roleProfiles.filter(function (p) {
      var inTargets = Object.keys(p.domainTargets || {}).some(function (domainId) { return p.domainTargets[domainId] === levelId; });
      var inOverrides = Object.keys(p.capabilityOverrides || {}).some(function (capId) { return (p.capabilityOverrides[capId] || {}).targetLevelId === levelId; });
      return inTargets || inOverrides;
    }).length;
    return { domains: domains, capabilities: capabilities, profiles: profiles, total: domains + capabilities + profiles };
  }

  function LevelEditor(services) {
    this.services = services;
    this.container = null;
  }

  LevelEditor.prototype.mount = function (container) {
    this.container = container;
  };

  LevelEditor.prototype.destroy = function () {
    this.container = null;
  };

  LevelEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    clear(this.container);
    var self = this;
    var services = this.services;
    var levels = calc.getSortedLevels(state);

    var section = el('div', { className: 'card' });
    section.appendChild(el('div', { className: 'section-header' }, [
      el('h2', { text: 'Levels' }),
      el('button', {
        type: 'button', className: 'btn btn-primary', text: 'Add Level',
        on: {
          click: function () {
            services.store.dispatch({ type: 'LEVEL_ADD', payload: { level: { name: 'New Level ' + (levels.length + 1) } } });
            services.toast.show('Level added.', 'success');
          }
        }
      })
    ]));
    section.appendChild(el('p', { className: 'text-muted', text: 'Levels define your internal maturity scale (e.g. Level 1 through Level 5). The highest order appears first in the Capability Map.' }));

    if (!levels.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [
        el('p', { text: 'No levels yet. Add a level to define your maturity scale (2 to 10 levels recommended).' })
      ]));
      this.container.appendChild(section);
      return;
    }

    var list = el('div', { className: 'level-list' });
    levels.forEach(function (level, idx) {
      var row = el('div', { className: 'level-row' });

      var nameInput = el('input', { type: 'text', className: 'input level-name-input', 'aria-label': 'Level name for ' + level.name });
      nameInput.value = level.name;
      nameInput.addEventListener('change', function () {
        var errors = validation.validateLevel({ name: nameInput.value });
        if (!errors.valid) { services.toast.show(errors.errors[0], 'error'); nameInput.value = level.name; return; }
        services.store.dispatch({ type: 'LEVEL_UPDATE', payload: { id: level.id, patch: { name: nameInput.value.trim() } } });
      });
      commitOnEnter(nameInput);

      var shortInput = el('input', { type: 'text', className: 'input level-short-input', maxLength: '12', 'aria-label': 'Short label for ' + level.name, placeholder: 'Short label' });
      shortInput.value = level.shortLabel || '';
      shortInput.addEventListener('change', function () {
        services.store.dispatch({ type: 'LEVEL_UPDATE', payload: { id: level.id, patch: { shortLabel: shortInput.value.trim() } } });
      });
      commitOnEnter(shortInput);

      var descInput = el('input', { type: 'text', className: 'input level-desc-input', 'aria-label': 'Generic description for ' + level.name, placeholder: 'Optional generic description' });
      descInput.value = level.description || '';
      descInput.addEventListener('change', function () {
        services.store.dispatch({ type: 'LEVEL_UPDATE', payload: { id: level.id, patch: { description: descInput.value.trim() } } });
      });
      commitOnEnter(descInput);

      var fields = el('div', { className: 'level-fields' }, [
        el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Name' }), nameInput]),
        el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Short label' }), shortInput]),
        el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descInput])
      ]);

      var controls = el('div', { className: 'level-controls' }, [
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + level.name + ' up', disabled: idx === 0, text: '\u2191',
          on: { click: function () { services.store.dispatch({ type: 'LEVEL_MOVE', payload: { id: level.id, direction: 'up' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + level.name + ' down', disabled: idx === levels.length - 1, text: '\u2193',
          on: { click: function () { services.store.dispatch({ type: 'LEVEL_MOVE', payload: { id: level.id, direction: 'down' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-danger-outline', text: 'Delete',
          on: {
            click: function () {
              var refs = countLevelReferences(level.id, state);
              var message = refs.total === 0
                ? 'Delete "' + level.name + '"? This level is not currently referenced.'
                : 'Delete "' + level.name + '"? This affects ' + refs.domains + ' domain description(s), ' +
                  refs.capabilities + ' capability definition(s), and ' + refs.profiles + ' role profile reference(s). ' +
                  'Affected capabilities without a remaining maturity definition will be flagged Unassigned rather than deleted.';
              services.modal.confirm({
                title: 'Delete level', message: message, confirmLabel: 'Delete level', danger: true
              }).then(function (confirmed) {
                if (!confirmed) { return; }
                services.store.dispatch({ type: 'LEVEL_DELETE', payload: { id: level.id } });
                services.toast.show('Level deleted.', 'success');
              });
            }
          }
        })
      ]);

      row.appendChild(el('div', { className: 'level-order-badge', text: 'Order ' + level.order }));
      row.appendChild(fields);
      row.appendChild(controls);
      list.appendChild(row);
    });
    section.appendChild(list);
    this.container.appendChild(section);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.LevelEditor = LevelEditor;
})(window);
