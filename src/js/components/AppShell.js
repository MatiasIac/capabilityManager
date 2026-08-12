/**
 * Application shell: header (framework name, view title, save status,
 * import/export/reset actions), left navigation, and the swappable main
 * view region. Owns the top-level Router subscription that mounts/destroys
 * view components (FR-018) without ever reloading the page.
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;
  var calc = global.RCF.calculations;

  var VIEW_TITLES = {
    'dashboard': 'Dashboard',
    'capability-map': 'Capability Map',
    'framework': 'Framework Builder',
    'roles': 'Roles',
    'mappings': 'Mappings'
  };

  function AppShell(services) {
    this.services = services;
    this.root = null;
    this.headerEls = {};
    this.viewContainer = null;
    this.navComponent = null;
    this.currentViewInstance = null;
    this.currentViewName = null;
    this.fileInput = null;
  }

  AppShell.prototype.mount = function (container) {
    var self = this;
    var services = this.services;
    clear(container);

    this.root = el('div', { className: 'app-shell' });
    this.root.appendChild(this.buildHeader());

    var body = el('div', { className: 'app-body' });
    var navWrap = el('div', { className: 'app-nav-wrap' });
    body.appendChild(navWrap);
    this.navComponent = new global.RCF.components.Navigation(services);
    this.navComponent.mount(navWrap);

    this.viewContainer = el('main', { className: 'app-view', id: 'view-container', tabIndex: '-1' });
    body.appendChild(this.viewContainer);
    this.root.appendChild(body);
    container.appendChild(this.root);

    var modalRoot = el('div', { id: 'modal-root' });
    var toastRoot = el('div', { id: 'toast-root', className: 'toast-root', 'aria-live': 'polite' });
    container.appendChild(modalRoot);
    container.appendChild(toastRoot);
    services.modal.mount(modalRoot);
    services.toast.mount(toastRoot);

    services.store.subscribe(function (state, action) { self.onStateChange(state, action); });
    services.eventBus.on('save-status', function (status) { self.setSaveStatus(status); });
    services.router.subscribe(function (route) { self.onRoute(route); });

    this.renderHeader(services.store.getState());
    this.setSaveStatus('saved');
  };

  AppShell.prototype.buildHeader = function () {
    var self = this;
    var services = this.services;

    var frameworkName = el('span', { className: 'header-framework-name', text: '' });
    var viewTitle = el('span', { className: 'header-view-title', text: '' });
    var saveStatus = el('span', { className: 'save-status', role: 'status' });

    this.headerEls.frameworkName = frameworkName;
    this.headerEls.viewTitle = viewTitle;
    this.headerEls.saveStatus = saveStatus;

    var menuToggle = el('button', {
      type: 'button', className: 'btn-icon nav-toggle', 'aria-label': 'Toggle navigation menu',
      text: '\u2630',
      on: { click: function () { self.root.classList.toggle('nav-open'); } }
    });

    this.fileInput = el('input', {
      type: 'file', accept: 'application/json,.json', className: 'sr-only',
      on: { change: function (evt) { self.handleImportFile(evt); } }
    });

    var importBtn = el('button', {
      type: 'button', className: 'btn btn-secondary', text: 'Import',
      on: { click: function () { self.fileInput.click(); } }
    });
    var exportBtn = el('button', {
      type: 'button', className: 'btn btn-secondary', text: 'Export',
      on: { click: function () { self.handleExport(); } }
    });
    var resetBtn = el('button', {
      type: 'button', className: 'btn btn-danger-outline', text: 'Reset Demo',
      on: { click: function () { self.handleResetDemo(); } }
    });

    return el('header', { className: 'app-header' }, [
      el('div', { className: 'app-header-left' }, [menuToggle, frameworkName, el('span', { className: 'header-sep', text: '/' }), viewTitle]),
      el('div', { className: 'app-header-right' }, [saveStatus, importBtn, exportBtn, resetBtn, this.fileInput])
    ]);
  };

  AppShell.prototype.renderHeader = function (state) {
    this.headerEls.frameworkName.textContent = (state.meta && state.meta.frameworkName) || 'Untitled Framework';
  };

  AppShell.prototype.setSaveStatus = function (status) {
    var label = status === 'saving' ? 'Saving...' : status === 'error' ? 'Storage error' : 'Saved locally';
    this.headerEls.saveStatus.textContent = label;
    this.headerEls.saveStatus.className = 'save-status save-status-' + status;
  };

  AppShell.prototype.onRoute = function (route) {
    var services = this.services;
    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
    }
    clear(this.viewContainer);
    this.root.classList.remove('nav-open');
    this.currentViewName = route.view;
    this.headerEls.viewTitle.textContent = VIEW_TITLES[route.view] || '';
    this.navComponent.setActiveView(route.view);

    var ViewClass = this.resolveViewClass(route.view);
    this.currentViewInstance = new ViewClass(services);
    this.currentViewInstance.mount(this.viewContainer);
    this.currentViewInstance.render(services.store.getState(), route.params);
  };

  AppShell.prototype.resolveViewClass = function (view) {
    var components = global.RCF.components;
    switch (view) {
      case 'capability-map': return components.CapabilityMap;
      case 'framework': return components.FrameworkEditor;
      case 'roles': return components.RoleFamilyEditor;
      case 'mappings': return components.MappingEditor;
      case 'dashboard':
      default: return components.Dashboard;
    }
  };

  AppShell.prototype.onStateChange = function (state, action) {
    this.renderHeader(state);
    this.services.persistence.scheduleSave(state);
    if (this.currentViewInstance && typeof this.currentViewInstance.render === 'function') {
      this.currentViewInstance.render(state, [], action);
    }
  };

  AppShell.prototype.handleExport = function () {
    global.RCF.importExport.exportState(this.services.store.getState());
    this.services.toast.show('Framework exported as JSON.', 'success');
  };

  AppShell.prototype.handleImportFile = function (evt) {
    var self = this;
    var services = this.services;
    var file = evt.target.files && evt.target.files[0];
    evt.target.value = '';
    if (!file) { return; }
    global.RCF.importExport.readImportFile(file).then(function (result) {
      var summaryList = el('dl', { className: 'import-summary' }, [
        el('dt', { text: 'Framework name' }), el('dd', { text: result.summary.frameworkName || '(none)' }),
        el('dt', { text: 'Schema version' }), el('dd', { text: String(result.summary.schemaVersion) }),
        el('dt', { text: 'Levels' }), el('dd', { text: String(result.summary.levels) }),
        el('dt', { text: 'Domains' }), el('dd', { text: String(result.summary.domains) }),
        el('dt', { text: 'Capabilities' }), el('dd', { text: String(result.summary.capabilities) }),
        el('dt', { text: 'Role families' }), el('dd', { text: String(result.summary.roleFamilies) })
      ]);
      return services.modal.confirm({
        title: 'Replace current framework?',
        message: 'Importing will replace all current data with the file below. This cannot be undone.',
        bodyNode: summaryList,
        confirmLabel: 'Replace Data',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) { return; }
        var pruned = global.RCF.validation.pruneInvalidReferences(result.state);
        services.store.replaceState(pruned);
        services.toast.show('Framework imported successfully.', 'success');
      });
    }).catch(function (err) {
      services.toast.show('Import failed: ' + err.message, 'error');
    });
  };

  AppShell.prototype.handleResetDemo = function () {
    var services = this.services;
    services.modal.confirm({
      title: 'Reset to demo data?',
      message: 'This replaces all current data with the seed demonstration framework. This cannot be undone.',
      confirmLabel: 'Reset Demo',
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) { return; }
      services.store.dispatch({ type: 'APP_RESET_DEMO', payload: { state: global.RCF.data.buildDemoState() } });
      services.uiState.setState({ selectedRoleFamilyId: null, selectedCareerStageId: null, capabilityMapDomainId: null });
      services.toast.show('Demo data restored.', 'success');
    });
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.AppShell = AppShell;
})(window);
