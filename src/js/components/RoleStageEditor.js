/**
 * Career stage detail editor (FR-061 to FR-064, FR-070): stage title and
 * description, copy-profile action, a capability radar for the stage, and
 * capability overrides grouped by domain. This component owns local UI
 * state (radar domain selection, override filters, expanded override rows)
 * that must survive re-renders triggered by Store dispatches, so `render`
 * caches its last arguments to support an internal self-rerender.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var commitOnEnter = global.RCF.utils.commitOnEnter;
  var debounce = global.RCF.utils.debounce;
  var captureFocus = global.RCF.utils.captureFocus;
  var restoreFocus = global.RCF.utils.restoreFocus;
  var calc = global.RCF.calculations;

  function RoleStageEditor(services) {
    this.services = services;
    this.container = null;
    this.overrideFilters = { search: '', domainId: '' };
    this.expandedCapIds = {};
    this.radarDomainIds = null; // null = default (first 10 by order)
    this._lastFamily = null;
    this._lastStage = null;
  }

  RoleStageEditor.prototype.mount = function (container) { this.container = container; };
  RoleStageEditor.prototype.destroy = function () { this.container = null; };

  RoleStageEditor.prototype.rerender = function () {
    this.render(this.services.store.getState(), this._lastFamily, this._lastStage);
  };

  RoleStageEditor.prototype.renderStageFields = function (state, roleFamily, stage, section) {
    var services = this.services;
    var titleInput = el('input', { type: 'text', className: 'input', 'aria-label': 'Stage title' });
    titleInput.value = stage.title;
    titleInput.addEventListener('change', function () {
      if (!titleInput.value.trim()) { services.toast.show('Stage title is required.', 'error'); titleInput.value = stage.title; return; }
      services.store.dispatch({ type: 'ROLE_STAGE_UPDATE', payload: { roleFamilyId: roleFamily.id, stageId: stage.id, patch: { title: titleInput.value.trim() } } });
    });
    commitOnEnter(titleInput);

    var shortInput = el('input', { type: 'text', className: 'input', 'aria-label': 'Short title', placeholder: 'Short title (for compact columns)' });
    shortInput.value = stage.shortTitle || '';
    shortInput.addEventListener('change', function () {
      services.store.dispatch({ type: 'ROLE_STAGE_UPDATE', payload: { roleFamilyId: roleFamily.id, stageId: stage.id, patch: { shortTitle: shortInput.value.trim() } } });
    });
    commitOnEnter(shortInput);

    var descTextarea = el('textarea', { className: 'input textarea', rows: '2', 'aria-label': 'Stage description', placeholder: 'What this career stage means\u2026' });
    descTextarea.value = stage.description || '';
    descTextarea.addEventListener('change', function () {
      services.store.dispatch({ type: 'ROLE_STAGE_UPDATE', payload: { roleFamilyId: roleFamily.id, stageId: stage.id, patch: { description: descTextarea.value } } });
    });

    section.appendChild(el('div', { className: 'stage-fields' }, [
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Title' }), titleInput]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Short title' }), shortInput]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descTextarea])
    ]));
  };

  RoleStageEditor.prototype.renderCopyControl = function (state, roleFamily, stage, section) {
    var self = this;
    var services = this.services;
    var allStageOptions = [];
    calc.getSortedRoleFamilies(state).forEach(function (fam) {
      calc.getSortedCareerStages(fam).forEach(function (s) {
        if (fam.id === roleFamily.id && s.id === stage.id) { return; }
        allStageOptions.push({ familyId: fam.id, stageId: s.id, label: fam.name + ' \u2014 ' + s.title });
      });
    });
    if (!allStageOptions.length) { return; }

    var select = el('select', { className: 'input', 'aria-label': 'Copy targets and overrides from' },
      allStageOptions.map(function (o) { return el('option', { value: o.familyId + '::' + o.stageId, text: o.label }); }));
    var copyBtn = el('button', {
      type: 'button', className: 'btn btn-secondary',
      text: 'Copy to "' + stage.title + '"',
      on: {
        click: function () {
          var parts = select.value.split('::');
          var currentProfile = calc.getRoleProfile(roleFamily.id, stage.id, state);
          var hasData = currentProfile && (Object.keys(currentProfile.domainTargets || {}).length || Object.keys(currentProfile.capabilityOverrides || {}).length);
          var doCopy = function () {
            services.store.dispatch({ type: 'ROLE_PROFILE_COPY', payload: { fromRoleFamilyId: parts[0], fromCareerStageId: parts[1], toRoleFamilyId: roleFamily.id, toCareerStageId: stage.id } });
            services.toast.show('Profile copied. You can now edit the copy.', 'success');
          };
          if (hasData) {
            services.modal.confirm({
              title: 'Overwrite existing profile?',
              message: 'This replaces all current domain targets and capability overrides for "' + stage.title + '" with a copy from the selected stage.',
              confirmLabel: 'Copy and overwrite', danger: true
            }).then(function (confirmed) { if (confirmed) { doCopy(); } });
          } else {
            doCopy();
          }
        }
      }
    });
    section.appendChild(el('div', { className: 'copy-profile-row' }, [
      el('span', { className: 'field-label', text: 'Copy profile from' }), select, copyBtn
    ]));
  };

  RoleStageEditor.prototype.renderRadar = function (state, roleFamily, stage, profile, section) {
    var self = this;
    var domains = calc.getSortedDomains(state);
    if (this.radarDomainIds === null) {
      this.radarDomainIds = domains.slice(0, 10).map(function (d) { return d.id; });
    }
    var radarWrap = el('div', { className: 'radar-section' });
    radarWrap.appendChild(el('h3', { text: 'Capability radar \u2014 ' + stage.title }));

    if (domains.length > 10) {
      var picker = el('div', { className: 'domain-picker' });
      picker.appendChild(el('p', { className: 'text-muted', text: 'More than 10 domains exist; choose up to 10 to plot (' + this.radarDomainIds.length + '/10 selected).' }));
      var list = el('div', { className: 'domain-picker-list' });
      domains.forEach(function (d) {
        var checked = self.radarDomainIds.indexOf(d.id) !== -1;
        var checkbox = el('input', { type: 'checkbox', id: 'radar-dom-' + d.id });
        checkbox.checked = checked;
        checkbox.disabled = !checked && self.radarDomainIds.length >= 10;
        checkbox.addEventListener('change', function () {
          if (checkbox.checked) {
            if (self.radarDomainIds.length < 10) { self.radarDomainIds.push(d.id); }
          } else {
            self.radarDomainIds = self.radarDomainIds.filter(function (id) { return id !== d.id; });
          }
          self.rerender();
        });
        list.appendChild(el('label', { className: 'domain-picker-item' }, [checkbox, el('span', { text: ' ' + d.name })]));
      });
      picker.appendChild(list);
      radarWrap.appendChild(picker);
    }

    var selectedDomains = domains.filter(function (d) { return self.radarDomainIds.indexOf(d.id) !== -1; });
    var axes = selectedDomains.map(function (d) { return { id: d.id, label: d.name, colour: d.colour }; });
    var values = {};
    selectedDomains.forEach(function (d) {
      var score = calc.getDomainTargetScore(profile, d.id, state);
      var level = score.levelId ? calc.getLevelById(score.levelId, state) : null;
      values[d.id] = { value: score.value, notSet: score.notSet, inferred: score.inferred, levelLabel: level ? level.name : (score.inferred ? 'Inferred (~' + score.order.toFixed(1) + ')' : '') };
    });
    var mount = el('div');
    radarWrap.appendChild(mount);
    section.appendChild(radarWrap);
    global.RCF.components.RadarChart.render(mount, { axes: axes, values: values, title: 'Capability radar for ' + stage.title });
  };

  RoleStageEditor.prototype.renderOverrides = function (state, roleFamily, stage, profile, section) {
    var self = this;
    var services = this.services;
    var overridesWrap = el('div', { className: 'overrides-section' });
    overridesWrap.appendChild(el('h3', { text: 'Capability overrides' }));
    overridesWrap.appendChild(el('p', { className: 'text-muted', text: 'An override always takes precedence over the domain default for this stage.' }));

    var domains = calc.getSortedDomains(state);
    var filterRow = el('div', { className: 'filter-row' });
    var searchInput = el('input', { type: 'search', className: 'input', placeholder: 'Search capabilities', 'aria-label': 'Search capabilities for overrides', 'data-focus-key': 'override-search' });
    searchInput.value = this.overrideFilters.search;
    searchInput.addEventListener('input', debounce(function () { self.overrideFilters.search = searchInput.value; self.rerender(); }, 200));
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Search' }), searchInput]));

    var domainFilter = el('select', { className: 'input', 'aria-label': 'Filter overrides by domain' },
      [el('option', { value: '', text: 'All Domains' })].concat(domains.map(function (d) { return el('option', { value: d.id, text: d.name }); })));
    domainFilter.value = this.overrideFilters.domainId;
    domainFilter.addEventListener('change', function () { self.overrideFilters.domainId = domainFilter.value; self.rerender(); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Domain' }), domainFilter]));
    overridesWrap.appendChild(filterRow);

    var search = this.overrideFilters.search.trim().toLowerCase();
    var shownDomains = this.overrideFilters.domainId ? domains.filter(function (d) { return d.id === self.overrideFilters.domainId; }) : domains;

    var anyRendered = false;
    shownDomains.forEach(function (domain) {
      var caps = state.capabilities.filter(function (c) { return c.domainId === domain.id; })
        .filter(function (c) {
          if (!search) { return true; }
          var haystack = ((c.code || '') + ' ' + (c.name || '')).toLowerCase();
          return haystack.indexOf(search) !== -1;
        })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      if (!caps.length) { return; }
      anyRendered = true;

      var domainTargetLevelId = profile.domainTargets ? profile.domainTargets[domain.id] : null;
      var domainTargetLevel = domainTargetLevelId ? calc.getLevelById(domainTargetLevelId, state) : null;
      var domainBlock = el('div', { className: 'override-domain-block', style: { '--domain-colour': domain.colour } });
      domainBlock.appendChild(el('h4', { text: domain.name + ' \u2014 domain default: ' + (domainTargetLevel ? domainTargetLevel.name : 'Not set') }));

      caps.forEach(function (cap) {
        var override = (profile.capabilityOverrides || {})[cap.id];
        var expanded = !!self.expandedCapIds[cap.id];
        var levels = calc.getSortedLevels(state);
        var effective = calc.getEffectiveCapabilityTarget(profile, cap, state);
        var effectiveLevel = effective.targetLevelId ? calc.getLevelById(effective.targetLevelId, state) : null;
        var effectiveText = effective.status === 'excluded' ? 'Excluded' : (effectiveLevel ? effective.status + ' \u2014 ' + effectiveLevel.name : 'Not set');

        var row = el('div', { className: 'override-row' });
        var summary = el('div', { className: 'override-row-summary' }, [
          el('span', { className: 'capability-card-code', text: cap.code || '?' }),
          el('span', { text: ' ' + (cap.name || '(untitled)') }),
          el('span', { className: 'text-muted', text: ' \u2014 ' + effectiveText }),
          override ? el('span', { className: 'card-badge card-badge-override', text: '\u2605 Override' }) : null,
          el('button', {
            type: 'button', className: 'btn btn-secondary btn-small', text: expanded ? 'Close' : (override ? 'Edit Override' : 'Add Override'),
            on: { click: function () { self.expandedCapIds[cap.id] = !expanded; self.rerender(); } }
          })
        ]);
        row.appendChild(summary);

        if (expanded) {
          var statusSelect = el('select', { className: 'input', 'aria-label': 'Override status for ' + cap.name }, [
            el('option', { value: 'required', text: 'Required' }),
            el('option', { value: 'optional', text: 'Optional' }),
            el('option', { value: 'excluded', text: 'Excluded' })
          ]);
          statusSelect.value = (override && override.status) || 'required';

          var levelSelect = el('select', { className: 'input', 'aria-label': 'Override target level for ' + cap.name },
            [el('option', { value: '', text: 'Inherit domain target' })].concat(levels.map(function (l) { return el('option', { value: l.id, text: l.name }); })));
          levelSelect.value = (override && override.targetLevelId) || '';

          var notesInput = el('textarea', { className: 'input textarea', rows: '2', placeholder: 'Optional notes' });
          notesInput.value = (override && override.notes) || '';

          var saveBtn = el('button', {
            type: 'button', className: 'btn btn-primary btn-small', text: 'Save Override',
            on: {
              click: function () {
                services.store.dispatch({
                  type: 'ROLE_PROFILE_SET_OVERRIDE',
                  payload: {
                    roleFamilyId: roleFamily.id, careerStageId: stage.id, capabilityId: cap.id,
                    override: { status: statusSelect.value, targetLevelId: levelSelect.value || null, notes: notesInput.value.trim() }
                  }
                });
                services.toast.show('Override saved.', 'success');
                self.expandedCapIds[cap.id] = false;
                self.rerender();
              }
            }
          });
          var removeBtn = el('button', {
            type: 'button', className: 'btn btn-danger-outline btn-small', text: 'Remove Override', disabled: !override,
            on: {
              click: function () {
                services.store.dispatch({ type: 'ROLE_PROFILE_REMOVE_OVERRIDE', payload: { roleFamilyId: roleFamily.id, careerStageId: stage.id, capabilityId: cap.id } });
                services.toast.show('Override removed.', 'success');
                self.expandedCapIds[cap.id] = false;
                self.rerender();
              }
            }
          });

          row.appendChild(el('div', { className: 'override-form' }, [
            el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Status' }), statusSelect]),
            el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Target level' }), levelSelect]),
            el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Notes' }), notesInput]),
            el('div', { className: 'override-form-actions' }, [saveBtn, removeBtn])
          ]));
        }
        domainBlock.appendChild(row);
      });
      overridesWrap.appendChild(domainBlock);
    });

    if (!anyRendered) {
      overridesWrap.appendChild(el('p', { className: 'empty-note', text: 'No capabilities match the current search/filter.' }));
    }
    section.appendChild(overridesWrap);
  };

  RoleStageEditor.prototype.render = function (state, roleFamily, stage) {
    if (!this.container) { return; }
    this._lastFamily = roleFamily;
    this._lastStage = stage;
    var focusSnapshot = captureFocus(this.container);
    clear(this.container);

    var section = el('div', { className: 'card stage-detail' });
    if (!roleFamily || !stage) {
      section.appendChild(el('p', { className: 'empty-note', text: 'Select a career stage above to view and edit its role profile.' }));
      this.container.appendChild(section);
      return;
    }

    section.appendChild(el('h2', { text: 'Stage detail: ' + stage.title }));
    this.renderStageFields(state, roleFamily, stage, section);
    this.renderCopyControl(state, roleFamily, stage, section);

    var profile = calc.getRoleProfile(roleFamily.id, stage.id, state) || { domainTargets: {}, capabilityOverrides: {} };
    this.renderRadar(state, roleFamily, stage, profile, section);
    this.renderOverrides(state, roleFamily, stage, profile, section);

    this.container.appendChild(section);
    restoreFocus(this.container, focusSnapshot);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.RoleStageEditor = RoleStageEditor;
})(window);
