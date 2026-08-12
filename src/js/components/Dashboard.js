/**
 * Dashboard view (FR-072). Summarises the framework, and shows a radar +
 * progression heatmap for a selected role family/career stage.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var calc = global.RCF.calculations;

  function Dashboard(services) {
    this.services = services;
    this.container = null;
  }

  Dashboard.prototype.mount = function (container) {
    this.container = container;
  };

  Dashboard.prototype.destroy = function () {
    this.container = null;
  };

  Dashboard.prototype.render = function (state) {
    if (!this.container) { return; }
    clear(this.container);
    var self = this;
    var services = this.services;
    var uiState = services.uiState.getState();

    var wrap = el('div', { className: 'view-dashboard' });

    var totalCareerStages = state.roleFamilies.reduce(function (sum, f) { return sum + (f.careerStages ? f.careerStages.length : 0); }, 0);
    var mappingCoverage = calc.getMappingCoverage(state);
    var kpis = [
      { label: 'Domains', value: state.domains.length },
      { label: 'Capabilities', value: state.capabilities.length },
      { label: 'Role Families', value: state.roleFamilies.length },
      { label: 'Career Stages', value: totalCareerStages },
      { label: 'Capabilities Mapped', value: mappingCoverage + '%' }
    ];
    wrap.appendChild(el('div', { className: 'kpi-row' }, kpis.map(function (k) {
      return el('div', { className: 'card kpi-card' }, [
        el('div', { className: 'kpi-value', text: String(k.value) }),
        el('div', { className: 'kpi-label', text: k.label })
      ]);
    })));

    var families = calc.getSortedRoleFamilies(state);
    var chartsSection = el('div', { className: 'card dashboard-charts' });

    if (!families.length) {
      chartsSection.appendChild(el('div', { className: 'section-header' }, [el('h2', { text: 'Role snapshot' })]));
      chartsSection.appendChild(el('div', { className: 'empty-state' }, [
        el('p', { text: 'No role families yet. Create a role family to define a career path.' }),
        el('a', { className: 'btn btn-primary', href: '#roles', text: 'Go to Roles' })
      ]));
      wrap.appendChild(chartsSection);
    } else {
      var selectedFamilyId = (uiState.selectedRoleFamilyId && families.some(function (f) { return f.id === uiState.selectedRoleFamilyId; }))
        ? uiState.selectedRoleFamilyId : families[0].id;
      var selectedFamily = families.filter(function (f) { return f.id === selectedFamilyId; })[0];
      var stages = calc.getSortedCareerStages(selectedFamily);
      var selectedStageId = (uiState.selectedCareerStageId && stages.some(function (s) { return s.id === uiState.selectedCareerStageId; }))
        ? uiState.selectedCareerStageId : (stages[0] ? stages[0].id : null);

      var header = el('div', { className: 'section-header' }, [el('h2', { text: 'Role snapshot' })]);

      var familySelect = el('select', { className: 'input', 'aria-label': 'Role family' },
        families.map(function (f) { return el('option', { value: f.id, text: f.name }); }));
      familySelect.value = selectedFamilyId;
      familySelect.addEventListener('change', function () {
        var newFamily = families.filter(function (f) { return f.id === familySelect.value; })[0];
        var newStages = newFamily ? calc.getSortedCareerStages(newFamily) : [];
        services.uiState.setState({ selectedRoleFamilyId: familySelect.value, selectedCareerStageId: newStages[0] ? newStages[0].id : null });
        self.render(services.store.getState());
      });

      var stageSelect = el('select', { className: 'input', 'aria-label': 'Career stage' },
        stages.map(function (s) { return el('option', { value: s.id, text: s.title }); }));
      if (selectedStageId) { stageSelect.value = selectedStageId; }
      stageSelect.addEventListener('change', function () {
        services.uiState.setState({ selectedCareerStageId: stageSelect.value });
        self.render(services.store.getState());
      });

      header.appendChild(el('div', { className: 'selector-group' }, [familySelect, stageSelect]));
      chartsSection.appendChild(header);

      var chartsGrid = el('div', { className: 'dashboard-charts-grid' });
      var radarCol = el('div', { className: 'chart-col' }, [el('h3', { text: 'Capability radar' })]);
      var radarMount = el('div');
      radarCol.appendChild(radarMount);
      var heatmapCol = el('div', { className: 'chart-col' }, [el('h3', { text: 'Progression heatmap \u2014 ' + selectedFamily.name })]);
      var heatmapMount = el('div');
      heatmapCol.appendChild(heatmapMount);
      chartsGrid.appendChild(radarCol);
      chartsGrid.appendChild(heatmapCol);
      chartsSection.appendChild(chartsGrid);
      wrap.appendChild(chartsSection);

      var domains = calc.getSortedDomains(state);

      if (selectedStageId) {
        var profile = calc.getRoleProfile(selectedFamilyId, selectedStageId, state) || {};
        var axes = domains.slice(0, 10).map(function (d) { return { id: d.id, label: d.name, colour: d.colour }; });
        var values = {};
        domains.forEach(function (d) {
          var score = calc.getDomainTargetScore(profile, d.id, state);
          var level = score.levelId ? calc.getLevelById(score.levelId, state) : null;
          values[d.id] = {
            value: score.value, notSet: score.notSet, inferred: score.inferred,
            levelLabel: level ? level.name : (score.inferred ? 'Inferred (~' + score.order.toFixed(1) + ')' : '')
          };
        });
        var stageTitle = (stages.filter(function (s) { return s.id === selectedStageId; })[0] || {}).title || '';
        global.RCF.components.RadarChart.render(radarMount, { axes: axes, values: values, title: 'Capability radar for ' + stageTitle });
      } else {
        radarMount.appendChild(el('p', { className: 'empty-note', text: 'Select a career stage to see its radar chart.' }));
      }

      var heatDomains = domains.map(function (d) { return { id: d.id, name: d.name, colour: d.colour }; });
      var heatColumns = stages.map(function (s) { return { id: s.id, label: s.shortTitle || s.title }; });
      global.RCF.components.Heatmap.render(heatmapMount, {
        domains: heatDomains, columns: heatColumns, title: 'Progression heatmap for ' + selectedFamily.name,
        getCell: function (domainId, stageId) {
          var p = calc.getRoleProfile(selectedFamilyId, stageId, state) || {};
          var score = calc.getDomainTargetScore(p, domainId, state);
          if (score.notSet) { return { notSet: true }; }
          var level = score.levelId ? calc.getLevelById(score.levelId, state) : null;
          return { value: score.value, inferred: score.inferred, levelLabel: level ? (level.shortLabel || level.name) : ('~' + score.order.toFixed(1)) };
        }
      });
    }

    wrap.appendChild(el('div', { className: 'card dashboard-summary' }, [
      el('h2', { text: 'Framework summary' }),
      el('p', { className: 'text-muted', text: state.meta.description || 'No description set.' }),
      el('div', { className: 'quick-actions' }, [
        el('a', { className: 'btn btn-secondary', href: '#framework', text: 'Open Framework Builder' }),
        el('a', { className: 'btn btn-secondary', href: '#capability-map', text: 'Open Capability Map' }),
        el('a', { className: 'btn btn-secondary', href: '#roles', text: 'Open Roles' }),
        el('a', { className: 'btn btn-secondary', href: '#mappings', text: 'Open Mappings' })
      ])
    ]));

    this.container.appendChild(wrap);
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.Dashboard = Dashboard;
})(window);
