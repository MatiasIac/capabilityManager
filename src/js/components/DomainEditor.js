/**
 * Domain management (FR-020, FR-021, FR-023, FR-024) and the per-domain
 * maturity ladder editor (FR-022), which is the primary editor mirroring
 * one sheet/page of the source workbook: stacked level bands with capability
 * cards, highest level first.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var commitOnEnter = global.RCF.utils.commitOnEnter;
  var calc = global.RCF.calculations;
  var validation = global.RCF.validation;

  /** Accessible colour palette offered when creating/editing a domain (FR-021). */
  var COLOUR_PALETTE = [
    { value: '#B45309', label: 'Amber' },
    { value: '#0E7490', label: 'Cyan' },
    { value: '#6D28D9', label: 'Violet' },
    { value: '#B91C1C', label: 'Red' },
    { value: '#15803D', label: 'Green' },
    { value: '#C2410C', label: 'Orange' },
    { value: '#1D4ED8', label: 'Blue' },
    { value: '#BE185D', label: 'Pink' },
    { value: '#4D7C0F', label: 'Lime' },
    { value: '#0F766E', label: 'Teal' },
    { value: '#7C3AED', label: 'Purple' },
    { value: '#334155', label: 'Slate' }
  ];

  function countDomainReferences(domainId, state) {
    var capIds = {};
    var capabilities = state.capabilities.filter(function (c) { return c.domainId === domainId; });
    capabilities.forEach(function (c) { capIds[c.id] = true; });
    var profilesAffected = state.roleProfiles.filter(function (p) {
      var inTargets = !!(p.domainTargets && p.domainTargets[domainId]);
      var inOverrides = Object.keys(p.capabilityOverrides || {}).some(function (capId) { return capIds[capId]; });
      return inTargets || inOverrides;
    }).length;
    var mappingsAffected = state.mappings.filter(function (m) {
      if (m.sourceType === 'domain' && m.sourceId === domainId) { return true; }
      if (m.sourceType === 'capability' && capIds[m.sourceId]) { return true; }
      return false;
    }).length;
    return { capabilities: capabilities.length, profiles: profilesAffected, mappings: mappingsAffected };
  }

  /** Opens the Add/Edit Domain modal form. */
  function openDomainForm(services, domain) {
    var store = services.store;
    var modal = services.modal;
    var toast = services.toast;
    var isEdit = !!domain;
    var draft = {
      name: (domain && domain.name) || '',
      shortCode: (domain && domain.shortCode) || '',
      description: (domain && domain.description) || '',
      colour: (domain && domain.colour) || COLOUR_PALETTE[0].value
    };

    var errorBanner = el('div', { className: 'form-errors', role: 'alert' });
    var nameInput = el('input', { type: 'text', className: 'input' });
    nameInput.value = draft.name;
    commitOnEnter(nameInput);

    var shortCodeInput = el('input', { type: 'text', className: 'input', maxLength: '6', placeholder: 'e.g. ARCH' });
    shortCodeInput.value = draft.shortCode;
    commitOnEnter(shortCodeInput);

    var descTextarea = el('textarea', { className: 'input textarea', rows: '2' });
    descTextarea.value = draft.description;

    var swatches = el('div', { className: 'colour-swatch-row', role: 'radiogroup', 'aria-label': 'Domain colour' });
    var swatchButtons = [];
    COLOUR_PALETTE.forEach(function (c) {
      var btn = el('button', {
        type: 'button', className: 'colour-swatch' + (draft.colour === c.value ? ' colour-swatch-selected' : ''),
        style: { backgroundColor: c.value }, title: c.label, 'aria-label': c.label,
        'aria-pressed': draft.colour === c.value ? 'true' : 'false'
      });
      btn.addEventListener('click', function () {
        draft.colour = c.value;
        swatchButtons.forEach(function (b) { b.classList.remove('colour-swatch-selected'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('colour-swatch-selected');
        btn.setAttribute('aria-pressed', 'true');
      });
      swatchButtons.push(btn);
      swatches.appendChild(btn);
    });

    var body = el('div', { className: 'domain-form' }, [
      errorBanner,
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Name' }), nameInput]),
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Short code' }), shortCodeInput]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descTextarea]),
      el('div', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Colour' }), swatches])
    ]);

    modal.open({
      title: isEdit ? 'Edit Domain' : 'Add Domain',
      bodyNode: body,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: function () { modal.close(); } },
        {
          label: isEdit ? 'Save Changes' : 'Create Domain', variant: 'primary',
          onClick: function () {
            clear(errorBanner);
            var candidate = { name: nameInput.value.trim(), shortCode: shortCodeInput.value.trim(), description: descTextarea.value.trim(), colour: draft.colour };
            var result = validation.validateDomain(candidate);
            if (!result.valid) {
              errorBanner.appendChild(el('ul', { className: 'error-list' }, result.errors.map(function (m) { return el('li', { text: m }); })));
              return;
            }
            if (isEdit) {
              store.dispatch({ type: 'DOMAIN_UPDATE', payload: { id: domain.id, patch: candidate } });
              toast.show('Domain updated.', 'success');
            } else {
              store.dispatch({ type: 'DOMAIN_ADD', payload: { domain: candidate } });
              toast.show('Domain created.', 'success');
            }
            modal.close();
          }
        }
      ]
    });
  }

  function DomainEditor(services) {
    this.services = services;
    this.container = null;
    this.selectedDomainId = null;
  }

  DomainEditor.prototype.mount = function (container) { this.container = container; };
  DomainEditor.prototype.destroy = function () { this.container = null; };

  DomainEditor.prototype.renderList = function (state, container) {
    var self = this;
    var services = this.services;
    var domains = calc.getSortedDomains(state);
    var levels = calc.getSortedLevels(state);

    var section = el('div', { className: 'card' });
    section.appendChild(el('div', { className: 'section-header' }, [
      el('h2', { text: 'Domains' }),
      el('button', { type: 'button', className: 'btn btn-primary', text: 'Add Domain', on: { click: function () { openDomainForm(services, null); } } })
    ]));

    if (!domains.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [
        el('p', { text: 'No domains yet. Add a domain (e.g. Architecture, Leadership) to start building your maturity ladder.' })
      ]));
      container.appendChild(section);
      return;
    }

    var grid = el('div', { className: 'domain-card-grid' });
    domains.forEach(function (domain, idx) {
      var capCount = state.capabilities.filter(function (c) { return c.domainId === domain.id; }).length;
      var descCount = levels.filter(function (l) { return domain.levelDescriptions && String(domain.levelDescriptions[l.id] || '').trim(); }).length;

      var card = el('div', { className: 'card domain-card', style: { '--domain-colour': domain.colour } });
      card.appendChild(el('div', { className: 'domain-card-header' }, [
        el('span', { className: 'domain-colour-dot', style: { backgroundColor: domain.colour } }),
        el('h3', { text: domain.name }),
        domain.shortCode ? el('span', { className: 'domain-shortcode', text: domain.shortCode }) : null
      ]));
      if (domain.description) { card.appendChild(el('p', { className: 'text-muted', text: domain.description })); }
      card.appendChild(el('p', { className: 'domain-card-stats', text: capCount + ' capabilit' + (capCount === 1 ? 'y' : 'ies') + ' \u2022 ' + descCount + '/' + levels.length + ' level descriptions complete' }));

      var actions = el('div', { className: 'domain-card-actions' }, [
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', text: 'Open Ladder', on: { click: function () { self.selectedDomainId = domain.id; self.render(services.store.getState()); } } }),
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', text: 'Edit', on: { click: function () { openDomainForm(services, domain); } } }),
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + domain.name + ' up', disabled: idx === 0, text: '\u2191',
          on: { click: function () { services.store.dispatch({ type: 'DOMAIN_MOVE', payload: { id: domain.id, direction: 'up' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + domain.name + ' down', disabled: idx === domains.length - 1, text: '\u2193',
          on: { click: function () { services.store.dispatch({ type: 'DOMAIN_MOVE', payload: { id: domain.id, direction: 'down' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-danger-outline btn-small', text: 'Delete',
          on: {
            click: function () {
              var refs = countDomainReferences(domain.id, state);
              services.modal.confirm({
                title: 'Delete domain',
                message: 'Delete "' + domain.name + '"? This removes ' + refs.capabilities + ' capabilit' + (refs.capabilities === 1 ? 'y' : 'ies') +
                  ', ' + refs.profiles + ' role profile reference(s), and ' + refs.mappings + ' external mapping(s).',
                confirmLabel: 'Delete domain', danger: true
              }).then(function (confirmed) {
                if (!confirmed) { return; }
                if (self.selectedDomainId === domain.id) { self.selectedDomainId = null; }
                services.store.dispatch({ type: 'DOMAIN_DELETE', payload: { id: domain.id } });
                services.toast.show('Domain deleted.', 'success');
              });
            }
          }
        })
      ]);
      card.appendChild(actions);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    container.appendChild(section);
  };

  DomainEditor.prototype.renderLadder = function (state, container) {
    var self = this;
    var services = this.services;
    var domain = calc.getDomainById(this.selectedDomainId, state);
    if (!domain) { this.selectedDomainId = null; return; }
    var levels = calc.getSortedLevels(state).slice().reverse(); // highest level first (FR-003/FR-022)

    var section = el('div', { className: 'card domain-ladder', style: { '--domain-colour': domain.colour } });
    var header = el('div', { className: 'section-header' }, [
      el('div', {}, [
        el('button', { type: 'button', className: 'btn-link', text: '\u2190 Back to Domains', on: { click: function () { self.selectedDomainId = null; self.render(services.store.getState()); } } }),
        el('h2', { text: domain.name + ' maturity ladder', style: { color: domain.colour } })
      ]),
      el('button', { type: 'button', className: 'btn btn-secondary', text: 'Edit Domain', on: { click: function () { openDomainForm(services, domain); } } })
    ]);
    section.appendChild(header);
    if (domain.description) { section.appendChild(el('p', { className: 'text-muted', text: domain.description })); }

    if (!levels.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [el('p', { text: 'No levels defined yet. Add levels above to build this ladder.' })]));
      container.appendChild(section);
      return;
    }

    levels.forEach(function (level) {
      var levelCaps = state.capabilities.filter(function (c) {
        return c.domainId === domain.id && (c.maturityDefinitions || []).some(function (def) { return def.levelId === level.id; });
      }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

      var band = el('div', { className: 'level-band' });
      band.appendChild(el('div', { className: 'level-band-header' }, [
        el('h3', { text: level.name }),
        level.description ? el('p', { className: 'text-muted level-generic-desc', text: level.description }) : null
      ]));

      var descTextarea = el('textarea', {
        className: 'input textarea', rows: '2', placeholder: 'Describe what "' + domain.name + '" looks like at ' + level.name + '\u2026',
        'aria-label': domain.name + ' description at ' + level.name
      });
      descTextarea.value = (domain.levelDescriptions && domain.levelDescriptions[level.id]) || '';
      descTextarea.addEventListener('change', function () {
        services.store.dispatch({ type: 'DOMAIN_SET_LEVEL_DESCRIPTION', payload: { domainId: domain.id, levelId: level.id, text: descTextarea.value } });
      });
      band.appendChild(descTextarea);

      var cardsRow = el('div', { className: 'capability-cards-row' });
      if (!levelCaps.length) {
        cardsRow.appendChild(el('p', { className: 'empty-note', text: 'No capabilities at this level yet.' }));
      } else {
        levelCaps.forEach(function (cap) {
          var isProgressive = cap.mode === 'progressive';
          var card = el('button', {
            type: 'button', className: 'capability-card' + (calc.isCapabilityComplete(cap) ? '' : ' capability-card-incomplete'),
            style: { '--domain-colour': domain.colour },
            on: { click: function () { global.RCF.components.CapabilityEditor.openDetail(services, cap.id); } }
          }, [
            el('span', { className: 'capability-card-code', text: cap.code || '?' }),
            el('span', { className: 'capability-card-name', text: cap.name || '(untitled)' }),
            isProgressive ? el('span', { className: 'capability-card-mode-badge', title: 'Progressive capability', text: 'P' }) : null,
            !calc.isCapabilityComplete(cap) ? el('span', { className: 'warning-icon', title: 'Incomplete', 'aria-label': 'Incomplete', text: '\u26A0' }) : null
          ]);
          cardsRow.appendChild(card);
        });
      }
      band.appendChild(cardsRow);
      band.appendChild(el('button', {
        type: 'button', className: 'btn btn-secondary btn-small', text: 'Add Capability',
        on: {
          click: function () {
            global.RCF.components.CapabilityEditor.openForm(services, {
              domainId: domain.id, levelId: level.id,
              onSaved: function () { self.render(services.store.getState()); }
            });
          }
        }
      }));
      section.appendChild(band);
    });

    container.appendChild(section);
  };

  DomainEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    clear(this.container);
    this.renderList(state, this.container);
    if (this.selectedDomainId) {
      this.renderLadder(state, this.container);
    }
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  DomainEditor.openDomainForm = openDomainForm;
  DomainEditor.COLOUR_PALETTE = COLOUR_PALETTE;
  global.RCF.components.DomainEditor = DomainEditor;
})(window);
