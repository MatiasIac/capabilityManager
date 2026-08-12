/**
 * External mapping editor (FR-080 to FR-084, FR-011 to FR-015): manages
 * reference framework instances (SFIA / e-CF / Custom) and the mapping
 * records that crosswalk internal domains/capabilities/career stages onto
 * them. Capability mapping is the primary use case (FR-080) but domain and
 * career stage sources are also supported via a source-type tab.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var debounce = global.RCF.utils.debounce;
  var commitOnEnter = global.RCF.utils.commitOnEnter;
  var captureFocus = global.RCF.utils.captureFocus;
  var restoreFocus = global.RCF.utils.restoreFocus;
  var svgEl = global.RCF.utils.svgEl;
  var calc = global.RCF.calculations;
  var validation = global.RCF.validation;

  var RELATIONSHIP_OPTIONS = [
    { value: 'equivalent', label: 'Equivalent' },
    { value: 'closely-related', label: 'Closely related' },
    { value: 'supports', label: 'Supports' },
    { value: 'partial-overlap', label: 'Partial overlap' }
  ];
  var CONFIDENCE_OPTIONS = [
    { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }
  ];
  var ECF_AREAS = ['Plan', 'Build', 'Run', 'Enable', 'Manage'];
  var TYPE_LABELS = { sfia: 'SFIA', ecf: 'e-CF', custom: 'Custom' };
  var SFIA_DEFAULT_LEVELS = [
    { order: 1, label: 'Follow' }, { order: 2, label: 'Assist' }, { order: 3, label: 'Apply' },
    { order: 4, label: 'Enable' }, { order: 5, label: 'Ensure, advise' }, { order: 6, label: 'Initiate, influence' },
    { order: 7, label: 'Set strategy, inspire, mobilise' }
  ];
  var ECF_DEFAULT_LEVELS = [
    { order: 1, label: 'e-1' }, { order: 2, label: 'e-2' }, { order: 3, label: 'e-3' }, { order: 4, label: 'e-4' }, { order: 5, label: 'e-5' }
  ];

  function relationshipLabel(value) {
    var found = RELATIONSHIP_OPTIONS.filter(function (r) { return r.value === value; })[0];
    return found ? found.label : value;
  }

  function typeDefaults(type) {
    if (type === 'sfia') { return { name: 'SFIA', version: 'SFIA 9', levels: SFIA_DEFAULT_LEVELS.slice(), areas: [] }; }
    if (type === 'ecf') { return { name: 'e-CF', version: 'EN 16234-1:2019 / e-CF', levels: ECF_DEFAULT_LEVELS.slice(), areas: ECF_AREAS.slice() }; }
    return { name: '', version: '', levels: [], areas: [] };
  }

  function parseLevelsText(text) {
    return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (label, idx) { return { order: idx + 1, label: label }; });
  }
  function levelsToText(levels) {
    return (levels || []).slice().sort(function (a, b) { return a.order - b.order; }).map(function (l) { return l.label; }).join('\n');
  }

  /** Opens the Add/Edit Reference Framework modal (FR-011-FR-014). */
  function openReferenceFrameworkForm(services, existing) {
    var store = services.store;
    var modal = services.modal;
    var toast = services.toast;
    var isEdit = !!existing;
    var initialType = (existing && existing.type) || 'sfia';

    var errorBanner = el('div', { className: 'form-errors', role: 'alert' });

    var typeSelect = el('select', { className: 'input' }, [
      el('option', { value: 'sfia', text: 'SFIA' }),
      el('option', { value: 'ecf', text: 'e-CF' }),
      el('option', { value: 'custom', text: 'Custom' })
    ]);
    typeSelect.value = initialType;

    var nameInput = el('input', { type: 'text', className: 'input' });
    nameInput.value = (existing && existing.name) || typeDefaults(initialType).name;
    commitOnEnter(nameInput);

    var versionInput = el('input', { type: 'text', className: 'input' });
    versionInput.value = (existing && existing.version) || typeDefaults(initialType).version;
    commitOnEnter(versionInput);

    var descTextarea = el('textarea', { className: 'input textarea', rows: '2' });
    descTextarea.value = (existing && existing.description) || '';

    var sourceUrlInput = el('input', { type: 'text', className: 'input', placeholder: 'https://\u2026' });
    sourceUrlInput.value = (existing && existing.sourceUrl) || '';
    commitOnEnter(sourceUrlInput);

    var levelsTextarea = el('textarea', {
      className: 'input textarea', rows: '4',
      placeholder: 'One level label per line, ordered lowest first'
    });
    levelsTextarea.value = existing ? levelsToText(existing.levels) : levelsToText(typeDefaults(initialType).levels);

    var areasInput = el('input', { type: 'text', className: 'input', placeholder: 'Comma-separated, e.g. Plan, Build, Run, Enable, Manage' });
    areasInput.value = existing ? (existing.areas || []).join(', ') : typeDefaults(initialType).areas.join(', ');

    if (!isEdit) {
      typeSelect.addEventListener('change', function () {
        var d = typeDefaults(typeSelect.value);
        nameInput.value = d.name;
        versionInput.value = d.version;
        levelsTextarea.value = levelsToText(d.levels);
        areasInput.value = d.areas.join(', ');
      });
    }

    var body = el('div', { className: 'domain-form' }, [
      errorBanner,
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Type' }), typeSelect]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Name' }), nameInput]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Version' }), versionInput]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descTextarea]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Source URL (optional)' }), sourceUrlInput]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Reference levels (one per line, ordered lowest first)' }), levelsTextarea]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Areas (optional, comma-separated)' }), areasInput])
    ]);

    modal.open({
      title: isEdit ? 'Edit Reference Framework' : 'Add Reference Framework',
      bodyNode: body,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: function () { modal.close(); } },
        {
          label: isEdit ? 'Save Changes' : 'Create Reference Framework', variant: 'primary',
          onClick: function () {
            clear(errorBanner);
            var candidate = {
              name: nameInput.value.trim(), type: typeSelect.value, version: versionInput.value.trim(),
              description: descTextarea.value.trim(), sourceUrl: sourceUrlInput.value.trim(),
              levels: parseLevelsText(levelsTextarea.value),
              areas: areasInput.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
            };
            var result = validation.validateReferenceFramework(candidate);
            if (!result.valid) {
              errorBanner.appendChild(el('ul', { className: 'error-list' }, result.errors.map(function (m) { return el('li', { text: m }); })));
              return;
            }
            if (isEdit) {
              store.dispatch({ type: 'REFERENCE_FRAMEWORK_UPDATE', payload: { id: existing.id, patch: candidate } });
              toast.show('Reference framework updated.', 'success');
            } else {
              store.dispatch({ type: 'REFERENCE_FRAMEWORK_ADD', payload: { referenceFramework: candidate } });
              toast.show('Reference framework created.', 'success');
            }
            modal.close();
          }
        }
      ]
    });
  }

  /** Builds the {value,label} options for the Source select of a given sourceType. */
  function getSourceOptions(sourceType, state) {
    if (sourceType === 'capability') {
      var options = [];
      calc.getSortedDomains(state).forEach(function (d) {
        calc.getCapabilitiesForDomain(d.id, state).forEach(function (c) {
          options.push({ value: c.id, label: d.name + ' \u2014 ' + (c.code ? c.code + ' ' : '') + (c.name || '(untitled)') });
        });
      });
      return options;
    }
    if (sourceType === 'domain') {
      return calc.getSortedDomains(state).map(function (d) { return { value: d.id, label: d.name }; });
    }
    var stageOptions = [];
    calc.getSortedRoleFamilies(state).forEach(function (f) {
      calc.getSortedCareerStages(f).forEach(function (s) { stageOptions.push({ value: s.id, label: f.name + ' \u2014 ' + s.title }); });
    });
    return stageOptions;
  }

  /** Opens the Add/Edit Mapping modal (FR-081, FR-015). presetSource: {sourceType, sourceId} for the "Add Mapping" row action. */
  function openMappingForm(services, existing, presetSource) {
    var store = services.store;
    var modal = services.modal;
    var toast = services.toast;
    var state = store.getState();
    var isEdit = !!existing;

    if (!state.referenceFrameworks.length) {
      modal.open({
        title: 'Add Mapping',
        bodyText: 'Create a reference framework first (SFIA, e-CF, or a custom framework), then add mappings to it.',
        actions: [{ label: 'Close', variant: 'secondary', onClick: function () { modal.close(); } }]
      });
      return;
    }

    var draftSourceId = (existing && existing.sourceId) || (presetSource && presetSource.sourceId) || '';
    var errorBanner = el('div', { className: 'form-errors', role: 'alert' });

    var sourceTypeSelect = el('select', { className: 'input' }, [
      el('option', { value: 'capability', text: 'Capability' }),
      el('option', { value: 'domain', text: 'Domain' }),
      el('option', { value: 'careerStage', text: 'Career Stage' })
    ]);
    sourceTypeSelect.value = (existing && existing.sourceType) || (presetSource && presetSource.sourceType) || 'capability';

    var sourceSelect = el('select', { className: 'input' });
    function rebuildSourceOptions() {
      clear(sourceSelect);
      var options = getSourceOptions(sourceTypeSelect.value, state);
      if (!options.length) {
        sourceSelect.appendChild(el('option', { value: '', text: '(none available - create one first)' }));
        return;
      }
      options.forEach(function (o) { sourceSelect.appendChild(el('option', { value: o.value, text: o.label })); });
      if (options.some(function (o) { return o.value === draftSourceId; })) { sourceSelect.value = draftSourceId; }
    }
    rebuildSourceOptions();
    sourceTypeSelect.addEventListener('change', function () { draftSourceId = ''; rebuildSourceOptions(); });

    var frameworkSelect = el('select', { className: 'input' },
      state.referenceFrameworks.map(function (rf) { return el('option', { value: rf.id, text: rf.name + (rf.version ? ' (' + rf.version + ')' : '') }); }));
    frameworkSelect.value = (existing && existing.referenceFrameworkId) || state.referenceFrameworks[0].id;

    var codeInput = el('input', { type: 'text', className: 'input' });
    codeInput.value = (existing && existing.referenceCode) || '';
    commitOnEnter(codeInput);

    var titleInput = el('input', { type: 'text', className: 'input' });
    titleInput.value = (existing && existing.referenceTitle) || '';
    commitOnEnter(titleInput);

    var levelFieldWrap = el('div', { className: 'field-block' });
    function rebuildLevelField(preserveExisting) {
      clear(levelFieldWrap);
      var rf = state.referenceFrameworks.filter(function (r) { return r.id === frameworkSelect.value; })[0];
      levelFieldWrap.appendChild(el('span', { className: 'field-label', text: 'Reference level' }));
      var initialValue = preserveExisting ? ((existing && existing.referenceLevel) || '') : '';
      if (rf && rf.levels && rf.levels.length) {
        var levelSelect = el('select', { className: 'input' }, [el('option', { value: '', text: '(none)' })].concat(
          rf.levels.slice().sort(function (a, b) { return a.order - b.order; }).map(function (l) {
            return el('option', { value: l.label, text: rf.type === 'sfia' ? (l.order + ' \u2014 ' + l.label) : l.label });
          })
        ));
        levelSelect.value = initialValue;
        levelFieldWrap.appendChild(levelSelect);
        levelFieldWrap._getValue = function () { return levelSelect.value; };
      } else {
        var levelInput = el('input', { type: 'text', className: 'input', placeholder: 'e.g. 5' });
        levelInput.value = initialValue;
        commitOnEnter(levelInput);
        levelFieldWrap.appendChild(levelInput);
        levelFieldWrap._getValue = function () { return levelInput.value.trim(); };
      }
    }

    var areaFieldWrap = el('div', { className: 'field-block' });
    function rebuildAreaField() {
      clear(areaFieldWrap);
      var rf = state.referenceFrameworks.filter(function (r) { return r.id === frameworkSelect.value; })[0];
      if (rf && rf.type === 'ecf' && rf.areas && rf.areas.length) {
        areaFieldWrap.style.display = '';
        areaFieldWrap.appendChild(el('span', { className: 'field-label', text: 'e-CF area (optional)' }));
        var areaSelect = el('select', { className: 'input' }, [el('option', { value: '', text: '(none)' })].concat(
          rf.areas.map(function (a) { return el('option', { value: a, text: a }); })
        ));
        areaFieldWrap.appendChild(areaSelect);
        areaFieldWrap._getValue = function () { return areaSelect.value; };
      } else {
        areaFieldWrap.style.display = 'none';
        areaFieldWrap._getValue = function () { return ''; };
      }
    }

    rebuildLevelField(true);
    rebuildAreaField();
    frameworkSelect.addEventListener('change', function () { rebuildLevelField(false); rebuildAreaField(); });

    var relationshipSelect = el('select', { className: 'input' }, RELATIONSHIP_OPTIONS.map(function (r) { return el('option', { value: r.value, text: r.label }); }));
    relationshipSelect.value = (existing && existing.relationship) || 'closely-related';

    var confidenceSelect = el('select', { className: 'input' }, CONFIDENCE_OPTIONS.map(function (c) { return el('option', { value: c.value, text: c.label }); }));
    confidenceSelect.value = (existing && existing.confidence) || 'medium';

    var notesTextarea = el('textarea', { className: 'input textarea', rows: '2' });
    notesTextarea.value = (existing && existing.notes) || '';

    var mappingSourceUrlInput = el('input', { type: 'text', className: 'input', placeholder: 'https://\u2026' });
    mappingSourceUrlInput.value = (existing && existing.sourceUrl) || '';
    commitOnEnter(mappingSourceUrlInput);

    var body = el('div', { className: 'domain-form' }, [
      errorBanner,
      el('p', { className: 'user-defined-mapping-notice', text: 'User-defined mapping \u2014 a manual crosswalk, not an automatic or authoritative equivalence.' }),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Source type' }), sourceTypeSelect]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Source' }), sourceSelect]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Reference framework' }), frameworkSelect]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Reference code' }), codeInput]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Reference title' }), titleInput]),
      el('label', { className: 'field-block' }, [levelFieldWrap]),
      el('label', { className: 'field-block' }, [areaFieldWrap]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Relationship' }), relationshipSelect]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Confidence' }), confidenceSelect]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Notes' }), notesTextarea]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Source URL (optional)' }), mappingSourceUrlInput])
    ]);

    modal.open({
      title: isEdit ? 'Edit Mapping' : 'Add Mapping',
      bodyNode: body,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: function () { modal.close(); } },
        {
          label: isEdit ? 'Save Changes' : 'Create Mapping', variant: 'primary',
          onClick: function () {
            clear(errorBanner);
            var notes = notesTextarea.value.trim();
            var areaValue = areaFieldWrap._getValue ? areaFieldWrap._getValue() : '';
            if (areaValue && notes.indexOf('e-CF area:') === -1) {
              notes = 'e-CF area: ' + areaValue + '. ' + notes;
            }
            var candidate = {
              sourceType: sourceTypeSelect.value,
              sourceId: sourceSelect.value,
              referenceFrameworkId: frameworkSelect.value,
              referenceCode: codeInput.value.trim(),
              referenceTitle: titleInput.value.trim(),
              referenceLevel: levelFieldWrap._getValue ? levelFieldWrap._getValue() : '',
              relationship: relationshipSelect.value,
              confidence: confidenceSelect.value,
              notes: notes,
              sourceUrl: mappingSourceUrlInput.value.trim()
            };
            var result = validation.validateMapping(candidate);
            if (!result.valid) {
              errorBanner.appendChild(el('ul', { className: 'error-list' }, result.errors.map(function (m) { return el('li', { text: m }); })));
              return;
            }
            if (isEdit) {
              store.dispatch({ type: 'MAPPING_UPDATE', payload: { id: existing.id, patch: candidate } });
              toast.show('Mapping updated.', 'success');
            } else {
              store.dispatch({ type: 'MAPPING_ADD', payload: { mapping: candidate } });
              toast.show('Mapping created.', 'success');
            }
            modal.close();
          }
        }
      ]
    });
  }

  function MappingEditor(services) {
    this.services = services;
    this.container = null;
    this.sourceTypeTab = 'capability';
    this.filters = { search: '', domainId: '', frameworkId: '', status: 'all' };
  }

  MappingEditor.prototype.mount = function (container) { this.container = container; };
  MappingEditor.prototype.destroy = function () { this.container = null; };

  MappingEditor.prototype.renderCoverage = function (state) {
    var pct = calc.getMappingCoverage(state);
    var size = 112, r = 44, stroke = 14;
    var circumference = 2 * Math.PI * r;
    var dash = (pct / 100 * circumference).toFixed(1) + ' ' + circumference.toFixed(1);
    var cx = size / 2, cy = size / 2;
    var titleId = 'mapping-coverage-title';
    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-labelledby': titleId }, [
      svgEl('title', { id: titleId, text: 'Mapping coverage: ' + pct + '% of capabilities have at least one external mapping' }),
      svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: '#E2E8F0', 'stroke-width': stroke }),
      svgEl('circle', {
        cx: cx, cy: cy, r: r, fill: 'none', stroke: '#2563EB', 'stroke-width': stroke, 'stroke-linecap': 'round',
        'stroke-dasharray': dash, transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
      }),
      svgEl('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'donut-text', text: pct + '%' })
    ]);

    return el('div', { className: 'card mapping-coverage-card' }, [
      el('h3', { text: 'Mapping coverage' }),
      el('div', { className: 'mapping-coverage-row' }, [
        svg,
        el('p', { className: 'text-muted', text: pct + '% of capabilities have at least one external mapping. Convenience metric only \u2014 it does not indicate mapping quality.' })
      ])
    ]);
  };

  MappingEditor.prototype.renderReferenceFrameworksStrip = function (state) {
    var services = this.services;
    var section = el('div', { className: 'card' });
    section.appendChild(el('div', { className: 'section-header' }, [
      el('h3', { text: 'Reference Frameworks' }),
      el('button', { type: 'button', className: 'btn btn-secondary btn-small', text: 'Add Reference Framework', on: { click: function () { openReferenceFrameworkForm(services, null); } } })
    ]));

    if (!state.referenceFrameworks.length) {
      section.appendChild(el('p', { className: 'empty-note', text: 'No reference frameworks yet. Add SFIA, e-CF, or a custom framework to start mapping.' }));
      return section;
    }

    var grid = el('div', { className: 'reference-framework-grid' });
    state.referenceFrameworks.forEach(function (rf) {
      var mappingCount = state.mappings.filter(function (m) { return m.referenceFrameworkId === rf.id; }).length;
      var card = el('div', { className: 'card reference-framework-card' }, [
        el('div', { className: 'reference-framework-card-header' }, [
          el('span', { className: 'card-badge card-badge-reftype-' + rf.type, text: TYPE_LABELS[rf.type] || rf.type }),
          el('h4', { text: rf.name })
        ]),
        el('p', { className: 'text-muted', text: rf.version || '\u2014' }),
        rf.description ? el('p', { className: 'text-muted reference-framework-desc', text: rf.description }) : null,
        el('p', { className: 'reference-framework-stats', text: mappingCount + ' mapping' + (mappingCount === 1 ? '' : 's') + ' \u2022 ' + (rf.levels || []).length + ' level(s)' }),
        el('div', { className: 'reference-framework-actions' }, [
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', text: 'Edit', on: { click: function () { openReferenceFrameworkForm(services, rf); } } }),
          el('button', {
            type: 'button', className: 'btn btn-danger-outline btn-small', text: 'Delete',
            on: {
              click: function () {
                services.modal.confirm({
                  title: 'Delete reference framework',
                  message: 'Delete "' + rf.name + '"? This removes ' + mappingCount + ' mapping(s) that reference it.',
                  confirmLabel: 'Delete reference framework', danger: true
                }).then(function (confirmed) {
                  if (!confirmed) { return; }
                  services.store.dispatch({ type: 'REFERENCE_FRAMEWORK_DELETE', payload: { id: rf.id } });
                  services.toast.show('Reference framework deleted.', 'success');
                });
              }
            }
          })
        ])
      ].filter(Boolean));
      grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
  };

  /** Builds one row per source entity for the active sourceTypeTab. */
  MappingEditor.prototype.getRows = function (state) {
    var sourceType = this.sourceTypeTab;
    var rows = [];
    if (sourceType === 'capability') {
      calc.getSortedDomains(state).forEach(function (d) {
        calc.getCapabilitiesForDomain(d.id, state).forEach(function (c) {
          rows.push({
            sourceType: 'capability', sourceId: c.id, domainId: d.id,
            label: (c.code ? c.code + ' ' : '') + (c.name || '(untitled)'), sublabel: d.name,
            searchText: ((c.code || '') + ' ' + (c.name || '') + ' ' + (c.description || '')).toLowerCase()
          });
        });
      });
    } else if (sourceType === 'domain') {
      calc.getSortedDomains(state).forEach(function (d) {
        rows.push({ sourceType: 'domain', sourceId: d.id, domainId: d.id, label: d.name, sublabel: 'Domain', searchText: d.name.toLowerCase() });
      });
    } else {
      calc.getSortedRoleFamilies(state).forEach(function (f) {
        calc.getSortedCareerStages(f).forEach(function (s) {
          rows.push({ sourceType: 'careerStage', sourceId: s.id, domainId: null, label: s.title, sublabel: f.name, searchText: (s.title + ' ' + f.name).toLowerCase() });
        });
      });
    }
    return rows;
  };

  MappingEditor.prototype.buildFilteredRows = function (state) {
    var self = this;
    var f = this.filters;
    var search = f.search.trim().toLowerCase();
    return this.getRows(state).map(function (row) {
      var allMappings = state.mappings.filter(function (m) { return m.sourceType === row.sourceType && m.sourceId === row.sourceId; });
      var mappingsForDisplay = f.frameworkId ? allMappings.filter(function (m) { return m.referenceFrameworkId === f.frameworkId; }) : allMappings;
      row.allMappings = allMappings;
      row.mappingsForDisplay = mappingsForDisplay;
      return row;
    }).filter(function (row) {
      if (self.sourceTypeTab === 'capability' && f.domainId && row.domainId !== f.domainId) { return false; }
      if (search && row.searchText.indexOf(search) === -1) { return false; }
      if (f.frameworkId && !row.mappingsForDisplay.length) { return false; }
      if (f.status === 'mapped' && !row.allMappings.length) { return false; }
      if (f.status === 'unmapped' && row.allMappings.length) { return false; }
      return true;
    });
  };

  MappingEditor.prototype.renderTable = function (state, rows) {
    var self = this;
    var services = this.services;
    var section = el('div', { className: 'card mapping-table-card' });
    if (!rows.length) {
      section.appendChild(el('p', { className: 'empty-note', text: 'No matches for the current filters.' }));
      return section;
    }

    var entityHeader = this.sourceTypeTab === 'capability' ? 'Capability' : this.sourceTypeTab === 'domain' ? 'Domain' : 'Career Stage';
    var table = el('div', { className: 'mapping-table', role: 'table' });
    table.appendChild(el('div', { className: 'mapping-table-row mapping-table-head', role: 'row' }, [
      el('span', { role: 'columnheader', text: entityHeader }),
      this.sourceTypeTab === 'capability' ? el('span', { role: 'columnheader', text: 'Domain' }) : null,
      el('span', { role: 'columnheader', text: 'Mappings' }),
      el('span', { role: 'columnheader', text: 'Actions' })
    ].filter(Boolean)));

    rows.forEach(function (row) {
      var mappingChips = el('div', { className: 'mapping-chip-row' });
      row.mappingsForDisplay.forEach(function (m) {
        var rf = state.referenceFrameworks.filter(function (r) { return r.id === m.referenceFrameworkId; })[0];
        var chip = el('button', {
          type: 'button', className: 'mapping-chip', title: 'Edit mapping',
          on: { click: function () { openMappingForm(services, m); } }
        }, [
          el('span', { className: 'mapping-chip-framework', text: rf ? rf.name : '(deleted framework)' }),
          el('span', { className: 'mapping-chip-code', text: (m.referenceCode || m.referenceTitle || '(untitled)') }),
          m.referenceLevel ? el('span', { className: 'mapping-chip-level', text: m.referenceLevel }) : null,
          el('span', { className: 'mapping-chip-relationship', text: relationshipLabel(m.relationship) })
        ].filter(Boolean));
        var removeBtn = el('button', {
          type: 'button', className: 'mapping-chip-remove', 'aria-label': 'Delete mapping to ' + (rf ? rf.name : 'framework'), text: '\u00D7',
          on: {
            click: function (evt) {
              evt.stopPropagation();
              services.modal.confirm({
                title: 'Delete mapping',
                message: 'Delete this mapping to "' + (m.referenceTitle || m.referenceCode || '(untitled)') + '"?',
                confirmLabel: 'Delete mapping', danger: true
              }).then(function (confirmed) {
                if (!confirmed) { return; }
                services.store.dispatch({ type: 'MAPPING_DELETE', payload: { id: m.id } });
                services.toast.show('Mapping deleted.', 'success');
              });
            }
          }
        });
        mappingChips.appendChild(el('span', { className: 'mapping-chip-wrap' }, [chip, removeBtn]));
      });
      if (!row.mappingsForDisplay.length) { mappingChips.appendChild(el('span', { className: 'empty-note', text: 'No mappings yet' })); }

      var titleCell = el('span', { role: 'cell' }, [
        el('div', { className: 'mapping-row-title', text: row.label }),
        self.sourceTypeTab !== 'capability' ? el('div', { className: 'text-muted mapping-row-sub', text: row.sublabel }) : null
      ].filter(Boolean));

      var rowEls = [
        titleCell,
        self.sourceTypeTab === 'capability' ? el('span', { role: 'cell', text: row.sublabel }) : null,
        el('span', { role: 'cell' }, [mappingChips]),
        el('span', { role: 'cell', className: 'row-actions' }, [
          el('button', {
            type: 'button', className: 'btn btn-secondary btn-small', text: 'Add Mapping',
            on: { click: function () { openMappingForm(services, null, { sourceType: row.sourceType, sourceId: row.sourceId }); } }
          })
        ])
      ].filter(Boolean);
      table.appendChild(el('div', { className: 'mapping-table-row', role: 'row' }, rowEls));
    });

    section.appendChild(table);
    return section;
  };

  MappingEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    var self = this;
    var services = this.services;
    var focusSnapshot = captureFocus(this.container);
    clear(this.container);

    var wrap = el('div', { className: 'view-mappings' });
    wrap.appendChild(this.renderCoverage(state));
    wrap.appendChild(this.renderReferenceFrameworksStrip(state));

    var tabBar = el('div', { className: 'tab-bar', role: 'tablist' });
    [['capability', 'Capabilities'], ['domain', 'Domains'], ['careerStage', 'Career Stages']].forEach(function (pair) {
      var isActive = self.sourceTypeTab === pair[0];
      tabBar.appendChild(el('button', {
        type: 'button', className: 'tab-button' + (isActive ? ' tab-button-active' : ''), role: 'tab', 'aria-selected': isActive ? 'true' : 'false', text: pair[1],
        on: { click: function () { self.sourceTypeTab = pair[0]; self.render(services.store.getState()); } }
      }));
    });
    wrap.appendChild(tabBar);

    var filterRow = el('div', { className: 'filter-row' });
    var searchInput = el('input', {
      type: 'search', className: 'input', placeholder: 'Search', 'aria-label': 'Search mappings', 'data-focus-key': 'mapping-search'
    });
    searchInput.value = this.filters.search;
    searchInput.addEventListener('input', debounce(function () { self.filters.search = searchInput.value; self.render(services.store.getState()); }, 200));
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Search' }), searchInput]));

    if (this.sourceTypeTab === 'capability') {
      var domains = calc.getSortedDomains(state);
      var domainFilter = el('select', { className: 'input', 'aria-label': 'Filter by domain' },
        [el('option', { value: '', text: 'All Domains' })].concat(domains.map(function (d) { return el('option', { value: d.id, text: d.name }); })));
      domainFilter.value = this.filters.domainId;
      domainFilter.addEventListener('change', function () { self.filters.domainId = domainFilter.value; self.render(services.store.getState()); });
      filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Domain' }), domainFilter]));
    }

    var frameworkFilter = el('select', { className: 'input', 'aria-label': 'Filter by external framework' },
      [el('option', { value: '', text: 'All Frameworks' })].concat(state.referenceFrameworks.map(function (rf) { return el('option', { value: rf.id, text: rf.name }); })));
    frameworkFilter.value = this.filters.frameworkId;
    frameworkFilter.addEventListener('change', function () { self.filters.frameworkId = frameworkFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'External framework' }), frameworkFilter]));

    var statusFilter = el('select', { className: 'input', 'aria-label': 'Filter mapped/unmapped' }, [
      el('option', { value: 'all', text: 'All' }),
      el('option', { value: 'mapped', text: 'Mapped' }),
      el('option', { value: 'unmapped', text: 'Unmapped' })
    ]);
    statusFilter.value = this.filters.status;
    statusFilter.addEventListener('change', function () { self.filters.status = statusFilter.value; self.render(services.store.getState()); });
    filterRow.appendChild(el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Status' }), statusFilter]));

    wrap.appendChild(filterRow);

    var rows = this.buildFilteredRows(state);
    wrap.appendChild(this.renderTable(state, rows));

    this.container.appendChild(wrap);
    restoreFocus(this.container, focusSnapshot);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.MappingEditor = MappingEditor;
})(window);
