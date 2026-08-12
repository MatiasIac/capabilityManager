/**
 * Capability Map (FR-040 to FR-044): periodic-table style browser for
 * capabilities, grouped by domain and level (highest level first), with
 * search/filter controls and an optional role-family/career-stage overlay
 * that emphasises in-scope capabilities and dims out-of-scope ones.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var debounce = global.RCF.utils.debounce;
  var captureFocus = global.RCF.utils.captureFocus;
  var restoreFocus = global.RCF.utils.restoreFocus;
  var calc = global.RCF.calculations;

  function CapabilityMap(services) {
    this.services = services;
    this.container = null;
    this.filters = { search: '', domainId: '', levelId: '', mode: 'all', mapping: 'all' };
  }

  CapabilityMap.prototype.mount = function (container) { this.container = container; };
  CapabilityMap.prototype.destroy = function () { this.container = null; };

  /** Builds a lookup of capabilityId -> overlay result, only when a career stage is selected. */
  CapabilityMap.prototype.buildOverlayMap = function (state, profile) {
    var overlays = {};
    if (!profile) { return overlays; }
    state.capabilities.forEach(function (cap) {
      overlays[cap.id] = calc.getRoleOverlayState(profile, cap, state);
    });
    return overlays;
  };

  CapabilityMap.prototype.renderCapabilityCard = function (state, cap, level, overlays) {
    var services = this.services;
    var classes = ['capability-card'];
    if (!calc.isCapabilityComplete(cap)) { classes.push('capability-card-incomplete'); }
    var badgeNodes = [];
    var overlay = overlays[cap.id];

    if (overlay) {
      var targetOrder = overlay.targetLevelId ? calc.getLevelOrder(overlay.targetLevelId, state) : null;
      var thisOrder = level.order;
      if (overlay.status === 'excluded') {
        classes.push('capability-card-excluded');
        badgeNodes.push(el('span', { className: 'card-badge card-badge-excluded', text: 'Excluded' }));
      } else if (!overlay.included) {
        classes.push('capability-card-dimmed');
      } else if (targetOrder !== null && thisOrder > targetOrder) {
        // Progressive definition above the resolved target: not yet applicable at this stage.
        classes.push('capability-card-dimmed');
      } else {
        classes.push(overlay.status === 'optional' ? 'capability-card-optional' : 'capability-card-in-scope');
        if (level.id === overlay.matchedLevelId) {
          var targetLevel = overlay.targetLevelId ? calc.getLevelById(overlay.targetLevelId, state) : null;
          var label = (overlay.status === 'optional' ? 'Optional' : 'Target') + (targetLevel ? ': ' + (targetLevel.shortLabel || targetLevel.name) : '');
          badgeNodes.push(el('span', { className: 'card-badge card-badge-target', text: label }));
        }
      }
      if (overlay.isOverride) {
        badgeNodes.push(el('span', { className: 'card-badge card-badge-override', title: 'Explicit override for this role stage', text: '\u2605 Override' }));
      }
    }

    return el('button', {
      type: 'button', className: classes.join(' '), style: { '--domain-colour': calc.getDomainById(cap.domainId, state) ? calc.getDomainById(cap.domainId, state).colour : '#64748B' },
      on: { click: function () { global.RCF.components.CapabilityEditor.openDetail(services, cap.id); } }
    }, [
      el('span', { className: 'capability-card-code', text: cap.code || '?' }),
      el('span', { className: 'capability-card-name', text: cap.name || '(untitled)' }),
      cap.mode === 'progressive' ? el('span', { className: 'capability-card-mode-badge', title: 'Progressive capability', text: 'P' }) : null,
      !calc.isCapabilityComplete(cap) ? el('span', { className: 'warning-icon', title: 'Incomplete', 'aria-label': 'Incomplete', text: '\u26A0' }) : null,
      badgeNodes.length ? el('span', { className: 'card-badge-row' }, badgeNodes) : null
    ]);
  };

  CapabilityMap.prototype.matchesFilters = function (cap, mappedCapIds) {
    var f = this.filters;
    if (f.mode !== 'all' && cap.mode !== f.mode) { return false; }
    if (f.levelId && !(cap.maturityDefinitions || []).some(function (d) { return d.levelId === f.levelId; })) { return false; }
    if (f.mapping === 'mapped' && !mappedCapIds[cap.id]) { return false; }
    if (f.mapping === 'unmapped' && mappedCapIds[cap.id]) { return false; }
    var search = f.search.trim().toLowerCase();
    if (search) {
      var haystack = ((cap.code || '') + ' ' + (cap.name || '') + ' ' + (cap.description || '')).toLowerCase();
      if (haystack.indexOf(search) === -1) { return false; }
    }
    return true;
  };

  CapabilityMap.prototype.renderDomainSection = function (state, domain, levelsDesc, overlays, mappedCapIds, skipEmptyLevels) {
    var self = this;
    var section = el('div', { className: 'capmap-domain-section', style: { '--domain-colour': domain.colour } });
    section.appendChild(el('div', { className: 'capmap-domain-heading' }, [
      el('span', { className: 'domain-colour-dot', style: { backgroundColor: domain.colour } }),
      el('h3', { text: domain.name })
    ]));

    var anyRendered = false;
    levelsDesc.forEach(function (level) {
      var capsAtLevel = state.capabilities.filter(function (c) {
        return c.domainId === domain.id && (c.maturityDefinitions || []).some(function (def) { return def.levelId === level.id; });
      }).filter(function (c) { return self.matchesFilters(c, mappedCapIds); })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

      if (!capsAtLevel.length && skipEmptyLevels) { return; }
      anyRendered = true;
      var row = el('div', { className: 'capmap-level-row' });
      row.appendChild(el('span', { className: 'capmap-level-label', text: level.name }));
      var cardsRow = el('div', { className: 'capability-cards-row' });
      if (!capsAtLevel.length) {
        cardsRow.appendChild(el('span', { className: 'empty-note', text: 'No matches' }));
      } else {
        capsAtLevel.forEach(function (cap) { cardsRow.appendChild(self.renderCapabilityCard(state, cap, level, overlays)); });
      }
      row.appendChild(cardsRow);
      section.appendChild(row);
    });

    return anyRendered ? section : null;
  };

  CapabilityMap.prototype.render = function (state) {
    if (!this.container) { return; }
    var self = this;
    var services = this.services;
    var uiState = services.uiState.getState();
    var focusSnapshot = captureFocus(this.container);
    clear(this.container);

    var domains = calc.getSortedDomains(state);
    var levels = calc.getSortedLevels(state);
    var levelsDesc = levels.slice().reverse();
    var wrap = el('div', { className: 'view-capability-map' });

    // --- Domain tabs/chips (FR-041) ---
    var activeDomainId = uiState.capabilityMapDomainId || 'all';
    if (activeDomainId !== 'all' && !domains.some(function (d) { return d.id === activeDomainId; })) { activeDomainId = 'all'; }
    var tabRow = el('div', { className: 'capmap-tab-row' });
    var allChip = el('button', {
      type: 'button', className: 'chip' + (activeDomainId === 'all' ? ' chip-active' : ''), text: 'All Domains',
      on: { click: function () { services.uiState.setState({ capabilityMapDomainId: 'all' }); self.render(services.store.getState()); } }
    });
    tabRow.appendChild(allChip);
    domains.forEach(function (d) {
      var chip = el('button', {
        type: 'button', className: 'chip' + (activeDomainId === d.id ? ' chip-active' : ''), style: { '--domain-colour': d.colour }, text: d.name,
        on: { click: function () { services.uiState.setState({ capabilityMapDomainId: d.id }); self.render(services.store.getState()); } }
      });
      tabRow.appendChild(chip);
    });
    wrap.appendChild(el('div', { className: 'capmap-tab-scroll' }, [tabRow]));

    // --- Filters (FR-042) ---
    var filterRow = el('div', { className: 'filter-row' });
    var searchInput = el('input', {
      type: 'search', className: 'input', placeholder: 'Search code, name, description',
      'aria-label': 'Search capabilities', 'data-focus-key': 'capmap-search'
    });
    searchInput.value = this.filters.search;
    searchInput.addEventListener('input', debounce(function () { self.filters.search = searchInput.value; self.render(services.store.getState()); }, 200));
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Search' }), searchInput]));

    if (activeDomainId === 'all') {
      var domainFilter = el('select', { className: 'input', 'aria-label': 'Narrow by domain' },
        [el('option', { value: '', text: 'All Domains shown' })].concat(domains.map(function (d) { return el('option', { value: d.id, text: d.name }); })));
      domainFilter.value = this.filters.domainId;
      domainFilter.addEventListener('change', function () { self.filters.domainId = domainFilter.value; self.render(services.store.getState()); });
      filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Narrow to domain' }), domainFilter]));
    }

    var levelFilter = el('select', { className: 'input', 'aria-label': 'Filter by level' },
      [el('option', { value: '', text: 'All Levels' })].concat(levels.map(function (l) { return el('option', { value: l.id, text: l.name }); })));
    levelFilter.value = this.filters.levelId;
    levelFilter.addEventListener('change', function () { self.filters.levelId = levelFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Level' }), levelFilter]));

    var modeFilter = el('select', { className: 'input', 'aria-label': 'Filter by mode' }, [
      el('option', { value: 'all', text: 'All Modes' }),
      el('option', { value: 'milestone', text: 'Milestone' }),
      el('option', { value: 'progressive', text: 'Progressive' })
    ]);
    modeFilter.value = this.filters.mode;
    modeFilter.addEventListener('change', function () { self.filters.mode = modeFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Mode' }), modeFilter]));

    var mappingFilter = el('select', { className: 'input', 'aria-label': 'Filter by mapping status' }, [
      el('option', { value: 'all', text: 'All' }),
      el('option', { value: 'mapped', text: 'Mapped' }),
      el('option', { value: 'unmapped', text: 'Unmapped' })
    ]);
    mappingFilter.value = this.filters.mapping;
    mappingFilter.addEventListener('change', function () { self.filters.mapping = mappingFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Mapping' }), mappingFilter]));

    wrap.appendChild(filterRow);

    // --- Role overlay controls (FR-043) ---
    var families = calc.getSortedRoleFamilies(state);
    var overlaySection = el('div', { className: 'card capmap-overlay-controls' });
    overlaySection.appendChild(el('h3', { text: 'Role overlay' }));
    var profile = null;
    var overlayStageLabel = '';
    if (!families.length) {
      overlaySection.appendChild(el('p', { className: 'empty-note', text: 'Create a role family in Roles to overlay a career stage here.' }));
    } else {
      var selectedFamilyId = (uiState.selectedRoleFamilyId && families.some(function (f) { return f.id === uiState.selectedRoleFamilyId; })) ? uiState.selectedRoleFamilyId : '';
      var selectedFamily = families.filter(function (f) { return f.id === selectedFamilyId; })[0];
      var stages = selectedFamily ? calc.getSortedCareerStages(selectedFamily) : [];
      var selectedStageId = (uiState.selectedCareerStageId && stages.some(function (s) { return s.id === uiState.selectedCareerStageId; })) ? uiState.selectedCareerStageId : '';

      var familySelect = el('select', { className: 'input', 'aria-label': 'Role family overlay' },
        [el('option', { value: '', text: 'No overlay' })].concat(families.map(function (f) { return el('option', { value: f.id, text: f.name }); })));
      familySelect.value = selectedFamilyId;
      familySelect.addEventListener('change', function () {
        var nf = families.filter(function (f) { return f.id === familySelect.value; })[0];
        var newStages = nf ? calc.getSortedCareerStages(nf) : [];
        services.uiState.setState({ selectedRoleFamilyId: familySelect.value || null, selectedCareerStageId: newStages[0] ? newStages[0].id : null });
        self.render(services.store.getState());
      });

      var stageSelect = el('select', { className: 'input', 'aria-label': 'Career stage overlay', disabled: !selectedFamily },
        stages.map(function (s) { return el('option', { value: s.id, text: s.title }); }));
      if (selectedStageId) { stageSelect.value = selectedStageId; }
      stageSelect.addEventListener('change', function () {
        services.uiState.setState({ selectedCareerStageId: stageSelect.value });
        self.render(services.store.getState());
      });

      overlaySection.appendChild(el('div', { className: 'selector-group' }, [familySelect, stageSelect]));

      if (selectedFamily && selectedStageId) {
        profile = calc.getRoleProfile(selectedFamily.id, selectedStageId, state);
        overlayStageLabel = selectedFamily.name + ' \u2014 ' + (stages.filter(function (s) { return s.id === selectedStageId; })[0] || {}).title;
      }
    }
    wrap.appendChild(overlaySection);

    if (profile) {
      wrap.appendChild(el('div', { className: 'capmap-legend' }, [
        el('span', { className: 'legend-title', text: 'Overlay for ' + overlayStageLabel + ':' }),
        el('span', { className: 'legend-item legend-in-scope', text: 'In scope' }),
        el('span', { className: 'legend-item legend-optional', text: 'Optional' }),
        el('span', { className: 'legend-item legend-dimmed', text: 'Out of scope' }),
        el('span', { className: 'legend-item legend-excluded', text: 'Excluded' }),
        el('span', { className: 'legend-item legend-override', text: '\u2605 Override applied' }),
        el('span', { className: 'legend-item legend-incomplete', text: '\u26A0 Incomplete definition' })
      ]));
    }

    var overlays = this.buildOverlayMap(state, profile);
    var mappedCapIds = {};
    state.mappings.forEach(function (m) { if (m.sourceType === 'capability') { mappedCapIds[m.sourceId] = true; } });

    if (!domains.length) {
      wrap.appendChild(el('div', { className: 'card empty-state' }, [el('p', { text: 'No domains yet. Add domains and capabilities in Framework Builder to populate the Capability Map.' })]));
      this.container.appendChild(wrap);
      return;
    }
    if (!levels.length) {
      wrap.appendChild(el('div', { className: 'card empty-state' }, [el('p', { text: 'No levels defined yet. Add levels in Framework Builder first.' })]));
      this.container.appendChild(wrap);
      return;
    }

    var resultsCard = el('div', { className: 'card capmap-results' });
    if (activeDomainId === 'all') {
      var shownDomains = this.filters.domainId ? domains.filter(function (d) { return d.id === self.filters.domainId; }) : domains;
      var anyDomainRendered = false;
      shownDomains.forEach(function (d) {
        var section = self.renderDomainSection(state, d, levelsDesc, overlays, mappedCapIds, true);
        if (section) { resultsCard.appendChild(section); anyDomainRendered = true; }
      });
      if (!anyDomainRendered) { resultsCard.appendChild(el('p', { className: 'empty-note', text: 'No capabilities match the current filters.' })); }
    } else {
      var domain = calc.getDomainById(activeDomainId, state);
      var section2 = this.renderDomainSection(state, domain, levelsDesc, overlays, mappedCapIds, false);
      if (section2) { resultsCard.appendChild(section2); }
      else { resultsCard.appendChild(el('p', { className: 'empty-note', text: 'No capabilities in this domain yet.' })); }
    }
    wrap.appendChild(resultsCard);

    this.container.appendChild(wrap);
    restoreFocus(this.container, focusSnapshot);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.CapabilityMap = CapabilityMap;
})(window);
