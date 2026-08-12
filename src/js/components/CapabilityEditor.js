/**
 * Capability create/edit form + detail modal (FR-030 to FR-034), plus the
 * flat "Capabilities" tab used inside Framework Builder. The maturity
 * definitions sub-editor mutates an in-memory draft and re-renders only its
 * own section, so switching Milestone/Progressive or adding/removing rows
 * never has to close/reopen the modal.
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
  var validation = global.RCF.validation;

  /** Opens the Add/Edit Capability modal. `opts`: { domainId, levelId, capability, onSaved }. */
  function openForm(services, opts) {
    opts = opts || {};
    var store = services.store;
    var modal = services.modal;
    var toast = services.toast;
    var state = store.getState();
    var original = opts.capability || null;
    var isEdit = !!original;
    var domains = calc.getSortedDomains(state);
    var levels = calc.getSortedLevels(state);

    var draft = {
      domainId: (original && original.domainId) || opts.domainId || (domains[0] && domains[0].id) || '',
      code: (original && original.code) || '',
      name: (original && original.name) || '',
      description: (original && original.description) || '',
      mode: (original && original.mode) || 'milestone',
      tags: (original && original.tags) ? original.tags.slice() : [],
      maturityDefinitions: original && original.maturityDefinitions
        ? JSON.parse(JSON.stringify(original.maturityDefinitions))
        : (opts.levelId ? [{ levelId: opts.levelId, statement: '', evidence: '' }] : [])
    };

    var errorBanner = el('div', { className: 'form-errors', role: 'alert' });
    var codeError = el('div', { className: 'field-error' });
    var nameError = el('div', { className: 'field-error' });

    var domainSelect = el('select', { className: 'input' }, domains.map(function (d) { return el('option', { value: d.id, text: d.name }); }));
    domainSelect.value = draft.domainId;
    domainSelect.addEventListener('change', function () { draft.domainId = domainSelect.value; });

    var codeInput = el('input', { type: 'text', className: 'input' });
    codeInput.value = draft.code;
    codeInput.addEventListener('change', function () { draft.code = codeInput.value; });
    commitOnEnter(codeInput);

    var nameInput = el('input', { type: 'text', className: 'input' });
    nameInput.value = draft.name;
    nameInput.addEventListener('change', function () { draft.name = nameInput.value; });
    commitOnEnter(nameInput);

    var descTextarea = el('textarea', { className: 'input textarea', rows: '3' });
    descTextarea.value = draft.description;
    descTextarea.addEventListener('change', function () { draft.description = descTextarea.value; });

    var tagsInput = el('input', { type: 'text', className: 'input', placeholder: 'e.g. core, leadership' });
    tagsInput.value = draft.tags.join(', ');
    tagsInput.addEventListener('change', function () {
      draft.tags = tagsInput.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    });
    commitOnEnter(tagsInput);

    var modeSelect = el('select', { className: 'input' }, [
      el('option', { value: 'milestone', text: 'Milestone (single level)' }),
      el('option', { value: 'progressive', text: 'Progressive (multiple levels)' })
    ]);
    modeSelect.value = draft.mode;

    var defsSection = el('div', { className: 'maturity-defs-section' });

    function renderDefs() {
      clear(defsSection);
      if (draft.mode === 'milestone' && draft.maturityDefinitions.length > 1) {
        draft.maturityDefinitions = draft.maturityDefinitions.slice(0, 1);
      }
      if (draft.maturityDefinitions.length === 0 && levels.length) {
        draft.maturityDefinitions.push({ levelId: levels[0].id, statement: '', evidence: '' });
      }
      draft.maturityDefinitions.forEach(function (def, idx) {
        var levelSelect = el('select', { className: 'input' }, levels.map(function (l) { return el('option', { value: l.id, text: l.name }); }));
        levelSelect.value = def.levelId || (levels[0] && levels[0].id) || '';
        levelSelect.addEventListener('change', function () { def.levelId = levelSelect.value; });

        var statementInput = el('textarea', { className: 'input textarea', rows: '2', placeholder: 'What this looks like at this level (required)' });
        statementInput.value = def.statement || '';
        statementInput.addEventListener('change', function () { def.statement = statementInput.value; });

        var evidenceInput = el('input', { type: 'text', className: 'input', placeholder: 'Optional example/evidence' });
        evidenceInput.value = def.evidence || '';
        evidenceInput.addEventListener('change', function () { def.evidence = evidenceInput.value; });

        var removeBtn = el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Remove this maturity definition', text: '\u00D7',
          disabled: draft.mode === 'milestone',
          on: { click: function () { draft.maturityDefinitions.splice(idx, 1); renderDefs(); } }
        });

        defsSection.appendChild(el('div', { className: 'maturity-def-row' }, [
          el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Level' }), levelSelect]),
          el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Statement' }), statementInput]),
          el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Evidence' }), evidenceInput]),
          removeBtn
        ]));
      });
      if (draft.mode === 'progressive') {
        defsSection.appendChild(el('button', {
          type: 'button', className: 'btn btn-secondary btn-small', text: 'Add Level Definition',
          on: {
            click: function () {
              var used = draft.maturityDefinitions.map(function (d) { return d.levelId; });
              var next = levels.filter(function (l) { return used.indexOf(l.id) === -1; })[0] || levels[0];
              draft.maturityDefinitions.push({ levelId: next ? next.id : '', statement: '', evidence: '' });
              renderDefs();
            }
          }
        }));
      }
    }
    renderDefs();

    modeSelect.addEventListener('change', function () { draft.mode = modeSelect.value; renderDefs(); });

    var body = el('div', { className: 'capability-form' }, [
      errorBanner,
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Domain' }), domainSelect]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Code' }), codeInput, codeError]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Name' }), nameInput, nameError]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descTextarea]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Tags' }), tagsInput]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Mode' }), modeSelect]),
      el('div', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Maturity definitions' }), defsSection])
    ]);

    function trySave() {
      clear(errorBanner); clear(codeError); clear(nameError);
      codeInput.classList.remove('input-invalid');
      nameInput.classList.remove('input-invalid');
      var candidate = {
        domainId: draft.domainId,
        code: draft.code.trim(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        mode: draft.mode,
        tags: draft.tags,
        maturityDefinitions: draft.maturityDefinitions.map(function (d) {
          return { levelId: d.levelId, statement: (d.statement || '').trim(), evidence: (d.evidence || '').trim() };
        })
      };
      var checkObj = Object.assign({ id: original ? original.id : null }, candidate);
      var result = validation.validateCapability(checkObj, store.getState());
      if (!result.valid) {
        var otherErrors = [];
        result.errors.forEach(function (msg) {
          if (/^Code/.test(msg)) { codeError.textContent = msg; codeInput.classList.add('input-invalid'); }
          else if (/^Name/.test(msg)) { nameError.textContent = msg; nameInput.classList.add('input-invalid'); }
          else { otherErrors.push(msg); }
        });
        if (otherErrors.length) {
          errorBanner.appendChild(el('ul', { className: 'error-list' }, otherErrors.map(function (m) { return el('li', { text: m }); })));
        }
        return;
      }
      if (isEdit) {
        store.dispatch({ type: 'CAPABILITY_UPDATE', payload: { id: original.id, patch: candidate } });
        toast.show('Capability updated.', 'success');
      } else {
        store.dispatch({ type: 'CAPABILITY_ADD', payload: { capability: candidate } });
        toast.show('Capability created.', 'success');
      }
      modal.close();
      if (opts.onSaved) { opts.onSaved(); }
    }

    modal.open({
      title: isEdit ? 'Edit Capability' : 'Add Capability',
      bodyNode: body,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: function () { modal.close(); } },
        { label: isEdit ? 'Save Changes' : 'Create Capability', variant: 'primary', onClick: trySave }
      ]
    });
  }

  /** Opens the read-only Capability detail panel (FR-034). */
  function openDetail(services, capabilityId) {
    var state = services.store.getState();
    var cap = calc.getCapabilityById(capabilityId, state);
    if (!cap) { return; }
    var domain = calc.getDomainById(cap.domainId, state);
    var levels = calc.getSortedLevels(state);
    var levelById = {};
    levels.forEach(function (l) { levelById[l.id] = l; });

    var body = el('div', { className: 'capability-detail' });
    body.appendChild(el('dl', { className: 'detail-list' }, [
      el('dt', { text: 'Code' }), el('dd', { text: cap.code || '(none)' }),
      el('dt', { text: 'Name' }), el('dd', { text: cap.name || '(none)' }),
      el('dt', { text: 'Domain' }), el('dd', { text: domain ? domain.name : 'Unknown domain' }),
      el('dt', { text: 'Mode' }), el('dd', { text: cap.mode === 'progressive' ? 'Progressive' : 'Milestone' })
    ]));
    if (cap.description) { body.appendChild(el('p', { text: cap.description })); }
    if (cap.tags && cap.tags.length) {
      body.appendChild(el('div', { className: 'tag-row' }, cap.tags.map(function (t) { return el('span', { className: 'tag-chip', text: t }); })));
    }
    if (!calc.isCapabilityComplete(cap)) {
      body.appendChild(el('p', { className: 'warning-banner', text: '\u26A0 Incomplete: needs at least one maturity definition referencing a valid level.' }));
    }

    body.appendChild(el('h3', { text: 'Maturity definitions' }));
    if (!cap.maturityDefinitions || !cap.maturityDefinitions.length) {
      body.appendChild(el('p', { className: 'empty-note', text: 'No maturity definitions yet.' }));
    } else {
      var defsList = el('div', { className: 'maturity-defs-readonly' });
      cap.maturityDefinitions.slice().sort(function (a, b) {
        var oa = a.levelId && levelById[a.levelId] ? levelById[a.levelId].order : 0;
        var ob = b.levelId && levelById[b.levelId] ? levelById[b.levelId].order : 0;
        return ob - oa;
      }).forEach(function (def) {
        var lvl = levelById[def.levelId];
        var row = el('div', { className: 'maturity-def-readonly-row' }, [
          el('strong', { text: lvl ? lvl.name : 'Unassigned level' }),
          el('p', { text: def.statement || '(No statement)' })
        ]);
        if (def.evidence) { row.appendChild(el('p', { className: 'text-muted', text: 'Evidence: ' + def.evidence })); }
        defsList.appendChild(row);
      });
      body.appendChild(defsList);
    }

    var refStages = [];
    state.roleFamilies.forEach(function (family) {
      (family.careerStages || []).forEach(function (stage) {
        var profile = calc.getRoleProfile(family.id, stage.id, state);
        if (profile && profile.capabilityOverrides && profile.capabilityOverrides[cap.id]) {
          refStages.push({ family: family, stage: stage, override: profile.capabilityOverrides[cap.id] });
        }
      });
    });
    body.appendChild(el('h3', { text: 'Role stages referencing this capability' }));
    if (!refStages.length) {
      body.appendChild(el('p', { className: 'empty-note', text: 'No role stage currently has an explicit override for this capability.' }));
    } else {
      body.appendChild(el('ul', { className: 'ref-list' }, refStages.map(function (r) {
        return el('li', { text: r.family.name + ' \u2014 ' + r.stage.title + ': ' + r.override.status });
      })));
    }

    var mappings = state.mappings.filter(function (m) { return m.sourceType === 'capability' && m.sourceId === cap.id; });
    body.appendChild(el('h3', { text: 'External mappings' }));
    if (!mappings.length) {
      body.appendChild(el('p', { className: 'empty-note', text: 'No external mappings yet.' }));
    } else {
      body.appendChild(el('ul', { className: 'ref-list' }, mappings.map(function (m) {
        var ref = state.referenceFrameworks.filter(function (r) { return r.id === m.referenceFrameworkId; })[0];
        return el('li', { text: (ref ? ref.name : 'Unknown framework') + ': ' + m.referenceCode + ' ' + m.referenceTitle + ' (' + m.relationship + ')' });
      })));
    }

    services.modal.open({
      title: 'Capability: ' + (cap.name || cap.code || 'Untitled'),
      bodyNode: body,
      actions: [
        { label: 'Delete', variant: 'danger', onClick: function () { services.modal.close(); confirmDelete(services, cap); } },
        { label: 'Edit', variant: 'secondary', onClick: function () { services.modal.close(); openForm(services, { capability: cap }); } },
        { label: 'Close', variant: 'secondary', onClick: function () { services.modal.close(); } }
      ]
    });
  }

  function confirmDelete(services, cap) {
    var state = services.store.getState();
    var overridesCount = state.roleProfiles.filter(function (p) { return p.capabilityOverrides && p.capabilityOverrides[cap.id]; }).length;
    var mappingsCount = state.mappings.filter(function (m) { return m.sourceType === 'capability' && m.sourceId === cap.id; }).length;
    services.modal.confirm({
      title: 'Delete capability',
      message: 'Delete "' + cap.name + '"? This removes ' + overridesCount + ' role override(s) and ' + mappingsCount + ' external mapping(s).',
      confirmLabel: 'Delete capability',
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) { return; }
      services.store.dispatch({ type: 'CAPABILITY_DELETE', payload: { id: cap.id } });
      services.toast.show('Capability deleted.', 'success');
    });
  }

  /** Flat, filterable "Capabilities" tab (complements the per-domain ladder in DomainEditor). */
  function CapabilityEditor(services) {
    this.services = services;
    this.container = null;
    this.filters = { search: '', domainId: '', levelId: '', mode: 'all', mapping: 'all' };
  }

  CapabilityEditor.prototype.mount = function (container) { this.container = container; };
  CapabilityEditor.prototype.destroy = function () { this.container = null; };

  CapabilityEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    var self = this;
    var services = this.services;
    var focusSnapshot = captureFocus(this.container);
    clear(this.container);

    var domains = calc.getSortedDomains(state);
    var levels = calc.getSortedLevels(state);
    var domainById = {};
    domains.forEach(function (d) { domainById[d.id] = d; });
    var levelById = {};
    levels.forEach(function (l) { levelById[l.id] = l; });

    var section = el('div', { className: 'card' });
    section.appendChild(el('div', { className: 'section-header' }, [
      el('h2', { text: 'Capabilities' }),
      el('button', {
        type: 'button', className: 'btn btn-primary', text: 'Add Capability',
        on: {
          click: function () {
            openForm(services, {
              domainId: self.filters.domainId || (domains[0] && domains[0].id),
              onSaved: function () { self.render(services.store.getState()); }
            });
          }
        }
      })
    ]));

    var filterRow = el('div', { className: 'filter-row' });
    var searchInput = el('input', {
      type: 'search', className: 'input', placeholder: 'Search code, name, description',
      'aria-label': 'Search capabilities', 'data-focus-key': 'capability-search'
    });
    searchInput.value = this.filters.search;
    searchInput.addEventListener('input', debounce(function () {
      self.filters.search = searchInput.value;
      self.render(services.store.getState());
    }, 200));
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Search' }), searchInput]));

    var domainFilter = el('select', { className: 'input', 'aria-label': 'Filter by domain' },
      [el('option', { value: '', text: 'All Domains' })].concat(domains.map(function (d) { return el('option', { value: d.id, text: d.name }); })));
    domainFilter.value = this.filters.domainId;
    domainFilter.addEventListener('change', function () { self.filters.domainId = domainFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Domain' }), domainFilter]));

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

    section.appendChild(filterRow);

    var mappedCapIds = {};
    state.mappings.forEach(function (m) { if (m.sourceType === 'capability') { mappedCapIds[m.sourceId] = true; } });

    var search = this.filters.search.trim().toLowerCase();
    var filtered = state.capabilities.filter(function (c) {
      if (self.filters.domainId && c.domainId !== self.filters.domainId) { return false; }
      if (self.filters.mode !== 'all' && c.mode !== self.filters.mode) { return false; }
      if (self.filters.levelId && !(c.maturityDefinitions || []).some(function (d) { return d.levelId === self.filters.levelId; })) { return false; }
      if (self.filters.mapping === 'mapped' && !mappedCapIds[c.id]) { return false; }
      if (self.filters.mapping === 'unmapped' && mappedCapIds[c.id]) { return false; }
      if (search) {
        var haystack = ((c.code || '') + ' ' + (c.name || '') + ' ' + (c.description || '')).toLowerCase();
        if (haystack.indexOf(search) === -1) { return false; }
      }
      return true;
    }).sort(function (a, b) {
      var da = domainById[a.domainId], db = domainById[b.domainId];
      if (da && db && da.order !== db.order) { return da.order - db.order; }
      return (a.order || 0) - (b.order || 0);
    });

    if (!state.capabilities.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [
        el('p', { text: 'No capabilities yet. Add a domain first, then add capabilities within it.' })
      ]));
    } else if (!filtered.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [el('p', { text: 'No capabilities match the current filters.' })]));
    } else {
      var table = el('div', { className: 'capability-table', role: 'table' });
      table.appendChild(el('div', { className: 'capability-table-row capability-table-head', role: 'row' }, [
        el('span', { role: 'columnheader', text: 'Code' }),
        el('span', { role: 'columnheader', text: 'Name' }),
        el('span', { role: 'columnheader', text: 'Domain' }),
        el('span', { role: 'columnheader', text: 'Level(s)' }),
        el('span', { role: 'columnheader', text: 'Mode' }),
        el('span', { role: 'columnheader', text: 'Mapped' }),
        el('span', { role: 'columnheader', text: 'Actions' })
      ]));
      filtered.forEach(function (cap) {
        var domain = domainById[cap.domainId];
        var defOrders = (cap.maturityDefinitions || [])
          .map(function (d) { return levelById[d.levelId]; })
          .filter(Boolean)
          .sort(function (a, b) { return a.order - b.order; });
        var levelLabel = defOrders.length === 0 ? '\u2014'
          : defOrders.length === 1 ? defOrders[0].name
          : (defOrders[0].shortLabel || defOrders[0].name) + ' \u2192 ' + (defOrders[defOrders.length - 1].shortLabel || defOrders[defOrders.length - 1].name);

        var nameCell = el('span', {}, [
          el('span', { text: cap.name || '(untitled)' }),
          !calc.isCapabilityComplete(cap) ? el('span', { className: 'warning-icon', title: 'Incomplete capability', 'aria-label': 'Incomplete', text: ' \u26A0' }) : null
        ]);

        var row = el('div', { className: 'capability-table-row', role: 'row' }, [
          el('span', { role: 'cell', text: cap.code || '\u2014' }),
          el('span', { role: 'cell' }, [nameCell]),
          el('span', { role: 'cell' }, [domain ? el('span', { className: 'domain-chip', style: { '--chip-colour': domain.colour }, text: domain.name }) : el('span', { className: 'text-muted', text: 'Unknown' })]),
          el('span', { role: 'cell', text: levelLabel }),
          el('span', { role: 'cell', text: cap.mode === 'progressive' ? 'Progressive' : 'Milestone' }),
          el('span', { role: 'cell', text: mappedCapIds[cap.id] ? 'Mapped' : 'Unmapped' }),
          el('span', { role: 'cell', className: 'row-actions' }, [
            el('button', { type: 'button', className: 'btn btn-secondary btn-small', text: 'View', on: { click: function () { openDetail(services, cap.id); } } }),
            el('button', {
              type: 'button', className: 'btn btn-secondary btn-small', text: 'Edit',
              on: { click: function () { openForm(services, { capability: cap, onSaved: function () { self.render(services.store.getState()); } }); } }
            })
          ])
        ]);
        table.appendChild(row);
      });
      section.appendChild(table);
    }

    this.container.appendChild(section);
    restoreFocus(this.container, focusSnapshot);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  CapabilityEditor.openForm = openForm;
  CapabilityEditor.openDetail = openDetail;
  global.RCF.components.CapabilityEditor = CapabilityEditor;
})(window);
