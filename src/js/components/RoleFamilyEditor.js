/**
 * Roles top-level view (section 18.4): role-family selector/CRUD, a career
 * ladder visual (FR-052/FR-053), and composes RoleProfileMatrix +
 * RoleStageEditor for the selected family/stage.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var commitOnEnter = global.RCF.utils.commitOnEnter;
  var generateId = global.RCF.utils.generateId;
  var calc = global.RCF.calculations;
  var validation = global.RCF.validation;

  function openRoleFamilyForm(services, roleFamily) {
    var store = services.store;
    var modal = services.modal;
    var toast = services.toast;
    var isEdit = !!roleFamily;
    var palette = global.RCF.components.DomainEditor.COLOUR_PALETTE;
    var draft = { colour: (roleFamily && roleFamily.colour) || palette[0].value };

    var errorBanner = el('div', { className: 'form-errors', role: 'alert' });
    var nameInput = el('input', { type: 'text', className: 'input' });
    nameInput.value = (roleFamily && roleFamily.name) || '';
    commitOnEnter(nameInput);
    var descTextarea = el('textarea', { className: 'input textarea', rows: '2' });
    descTextarea.value = (roleFamily && roleFamily.description) || '';

    var swatches = el('div', { className: 'colour-swatch-row', role: 'radiogroup', 'aria-label': 'Role family colour' });
    var swatchButtons = [];
    palette.forEach(function (c) {
      var btn = el('button', {
        type: 'button', className: 'colour-swatch' + (draft.colour === c.value ? ' colour-swatch-selected' : ''),
        style: { backgroundColor: c.value }, title: c.label, 'aria-label': c.label
      });
      btn.addEventListener('click', function () {
        draft.colour = c.value;
        swatchButtons.forEach(function (b) { b.classList.remove('colour-swatch-selected'); });
        btn.classList.add('colour-swatch-selected');
      });
      swatchButtons.push(btn);
      swatches.appendChild(btn);
    });

    var body = el('div', { className: 'domain-form' }, [
      errorBanner,
      el('label', { className: 'field-block' }, [el('span', { className: 'field-label', text: 'Name' }), nameInput]),
      el('label', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Description' }), descTextarea]),
      el('div', { className: 'field-block field-block-wide' }, [el('span', { className: 'field-label', text: 'Colour' }), swatches])
    ]);

    modal.open({
      title: isEdit ? 'Edit Role Family' : 'Add Role Family',
      bodyNode: body,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: function () { modal.close(); } },
        {
          label: isEdit ? 'Save Changes' : 'Create Role Family', variant: 'primary',
          onClick: function () {
            clear(errorBanner);
            var candidate = { name: nameInput.value.trim(), description: descTextarea.value.trim(), colour: draft.colour };
            var result = validation.validateRoleFamily(candidate);
            if (!result.valid) {
              errorBanner.appendChild(el('ul', { className: 'error-list' }, result.errors.map(function (m) { return el('li', { text: m }); })));
              return;
            }
            if (isEdit) {
              store.dispatch({ type: 'ROLE_FAMILY_UPDATE', payload: { id: roleFamily.id, patch: candidate } });
              toast.show('Role family updated.', 'success');
            } else {
              store.dispatch({ type: 'ROLE_FAMILY_ADD', payload: { roleFamily: candidate } });
              toast.show('Role family created.', 'success');
            }
            modal.close();
          }
        }
      ]
    });
  }

  function RoleFamilyEditor(services) {
    this.services = services;
    this.container = null;
    this.matrix = new global.RCF.components.RoleProfileMatrix(services);
    this.stageEditor = new global.RCF.components.RoleStageEditor(services);
  }

  RoleFamilyEditor.prototype.mount = function (container) {
    this.container = container;
    this.headerMount = el('div');
    this.ladderMount = el('div');
    this.matrixMount = el('div');
    this.stageMount = el('div');
    container.appendChild(this.headerMount);
    container.appendChild(this.ladderMount);
    container.appendChild(this.matrixMount);
    container.appendChild(this.stageMount);
    this.matrix.mount(this.matrixMount);
    this.stageEditor.mount(this.stageMount);
  };

  RoleFamilyEditor.prototype.destroy = function () {
    this.matrix.destroy();
    this.stageEditor.destroy();
    if (this.container) { clear(this.container); }
    this.container = null;
  };

  RoleFamilyEditor.prototype.renderHeader = function (state, families, selectedFamily) {
    var self = this;
    var services = this.services;
    clear(this.headerMount);
    var section = el('div', { className: 'card' });
    section.appendChild(el('div', { className: 'section-header' }, [
      el('h2', { text: 'Roles' }),
      el('button', { type: 'button', className: 'btn btn-primary', text: 'Add Role Family', on: { click: function () { openRoleFamilyForm(services, null); } } })
    ]));

    if (!families.length) {
      section.appendChild(el('div', { className: 'empty-state' }, [
        el('p', { text: 'No role families yet. Create one (e.g. Software Engineering) to start building a career ladder.' })
      ]));
      this.headerMount.appendChild(section);
      return;
    }

    var familySelect = el('select', { className: 'input', 'aria-label': 'Selected role family' },
      families.map(function (f) { return el('option', { value: f.id, text: f.name }); }));
    familySelect.value = selectedFamily.id;
    // uiState changes don't flow through the Store, so re-render this view explicitly.
    familySelect.addEventListener('change', function () {
      var nf = families.filter(function (f) { return f.id === familySelect.value; })[0];
      var newStages = nf ? calc.getSortedCareerStages(nf) : [];
      services.uiState.setState({ selectedRoleFamilyId: familySelect.value, selectedCareerStageId: newStages[0] ? newStages[0].id : null });
      self.render(services.store.getState());
    });

    var controlsRow = el('div', { className: 'selector-group' }, [
      familySelect,
      el('button', { type: 'button', className: 'btn btn-secondary', text: 'Edit Family', on: { click: function () { openRoleFamilyForm(services, selectedFamily); } } }),
      el('button', {
        type: 'button', className: 'btn btn-danger-outline', text: 'Delete Family',
        on: {
          click: function () {
            var stageCount = (selectedFamily.careerStages || []).length;
            var profileCount = state.roleProfiles.filter(function (p) { return p.roleFamilyId === selectedFamily.id; }).length;
            services.modal.confirm({
              title: 'Delete role family',
              message: 'Delete "' + selectedFamily.name + '"? This removes ' + stageCount + ' career stage(s) and ' + profileCount + ' role profile(s).',
              confirmLabel: 'Delete role family', danger: true
            }).then(function (confirmed) {
              if (!confirmed) { return; }
              services.uiState.setState({ selectedRoleFamilyId: null, selectedCareerStageId: null });
              services.store.dispatch({ type: 'ROLE_FAMILY_DELETE', payload: { id: selectedFamily.id } });
              services.toast.show('Role family deleted.', 'success');
            });
          }
        }
      })
    ]);
    if (selectedFamily.description) {
      section.appendChild(el('p', { className: 'text-muted', text: selectedFamily.description }));
    }
    section.appendChild(controlsRow);
    this.headerMount.appendChild(section);
  };

  RoleFamilyEditor.prototype.renderLadder = function (state, selectedFamily, stages, selectedStageId) {
    var self = this;
    var services = this.services;
    clear(this.ladderMount);
    if (!selectedFamily) { return; }
    var section = el('div', { className: 'card' });
    section.appendChild(el('h3', { text: 'Career ladder' }));

    var ladder = el('div', { className: 'career-ladder' });
    stages.forEach(function (stage, idx) {
      var isSelected = stage.id === selectedStageId;
      var card = el('div', { className: 'career-stage-card' + (isSelected ? ' career-stage-card-selected' : '') });
      card.appendChild(el('button', {
        type: 'button', className: 'career-stage-select', text: stage.title,
        on: { click: function () { services.uiState.setState({ selectedCareerStageId: stage.id }); self.render(services.store.getState()); } }
      }));
      card.appendChild(el('div', { className: 'career-stage-controls' }, [
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + stage.title + ' earlier', disabled: idx === 0, text: '\u2190',
          on: { click: function () { services.store.dispatch({ type: 'ROLE_STAGE_MOVE', payload: { roleFamilyId: selectedFamily.id, stageId: stage.id, direction: 'up' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-icon', 'aria-label': 'Move ' + stage.title + ' later', disabled: idx === stages.length - 1, text: '\u2192',
          on: { click: function () { services.store.dispatch({ type: 'ROLE_STAGE_MOVE', payload: { roleFamilyId: selectedFamily.id, stageId: stage.id, direction: 'down' } }); } }
        }),
        el('button', {
          type: 'button', className: 'btn btn-icon btn-danger-outline', 'aria-label': 'Delete ' + stage.title, text: '\u00D7',
          on: {
            click: function () {
              services.modal.confirm({
                title: 'Delete career stage',
                message: 'Delete "' + stage.title + '"? This removes only this stage\u2019s role profile (domain targets and overrides) \u2014 no framework capability data is affected.',
                confirmLabel: 'Delete stage', danger: true
              }).then(function (confirmed) {
                if (!confirmed) { return; }
                if (selectedStageId === stage.id) { services.uiState.setState({ selectedCareerStageId: null }); }
                services.store.dispatch({ type: 'ROLE_STAGE_DELETE', payload: { roleFamilyId: selectedFamily.id, stageId: stage.id } });
                services.toast.show('Career stage deleted.', 'success');
              });
            }
          }
        })
      ]));
      ladder.appendChild(card);
      if (idx < stages.length - 1) { ladder.appendChild(el('span', { className: 'career-ladder-connector', 'aria-hidden': 'true', text: '\u2192' })); }
    });

    ladder.appendChild(el('button', {
      type: 'button', className: 'btn btn-secondary career-stage-add', text: '+ Add Stage',
      on: {
        click: function () {
          var newId = generateId('stage');
          // Set uiState before dispatch: Store.dispatch() notifies listeners
          // (AppShell's render) synchronously, so uiState must already
          // reflect the new selection for the stage to appear selected.
          services.uiState.setState({ selectedCareerStageId: newId });
          services.store.dispatch({ type: 'ROLE_STAGE_ADD', payload: { roleFamilyId: selectedFamily.id, stage: { id: newId, title: 'New Stage' } } });
        }
      }
    }));
    section.appendChild(ladder);
    if (!stages.length) { section.appendChild(el('p', { className: 'empty-note', text: 'No career stages yet. Add one to start the ladder.' })); }
    this.ladderMount.appendChild(section);
  };

  RoleFamilyEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    var services = this.services;
    var uiState = services.uiState.getState();
    var families = calc.getSortedRoleFamilies(state);
    var selectedFamilyId = (uiState.selectedRoleFamilyId && families.some(function (f) { return f.id === uiState.selectedRoleFamilyId; }))
      ? uiState.selectedRoleFamilyId : (families[0] ? families[0].id : null);
    var selectedFamily = families.filter(function (f) { return f.id === selectedFamilyId; })[0] || null;

    this.renderHeader(state, families, selectedFamily);

    var stages = selectedFamily ? calc.getSortedCareerStages(selectedFamily) : [];
    var selectedStageId = (uiState.selectedCareerStageId && stages.some(function (s) { return s.id === uiState.selectedCareerStageId; }))
      ? uiState.selectedCareerStageId : (stages[0] ? stages[0].id : null);
    var selectedStage = stages.filter(function (s) { return s.id === selectedStageId; })[0] || null;

    this.renderLadder(state, selectedFamily, stages, selectedStageId);
    this.matrix.render(state, selectedFamily);
    this.stageEditor.render(state, selectedFamily, selectedStage);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.RoleFamilyEditor = RoleFamilyEditor;
})(window);
