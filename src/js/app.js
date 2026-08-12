/**
 * Application bootstrap: wires up core services, loads persisted state
 * (or seeds the demo dataset on first run), and mounts the AppShell.
 * This is the only file that constructs the global `services` object
 * shared by every component (FR-090, section 19.3).
 */
(function (global) {
  'use strict';

  function boot() {
    var core = global.RCF.core;
    var components = global.RCF.components;
    var validation = global.RCF.validation;

    var eventBus = new core.EventBus();
    var persistence = new core.Persistence(eventBus);
    var router = new core.Router();
    var uiState = new core.UiState();
    var modal = new components.Modal();
    var toast = new components.Toast();

    var initialState = null;
    var loaded = persistence.load();
    if (loaded && validation.validateImportedState(loaded).valid) {
      initialState = validation.pruneInvalidReferences(loaded);
    } else {
      initialState = global.RCF.data.buildDemoState();
    }

    var store = new core.Store(initialState);

    var services = {
      store: store,
      eventBus: eventBus,
      router: router,
      persistence: persistence,
      modal: modal,
      toast: toast,
      uiState: uiState
    };

    var root = document.getElementById('app-root');
    var appShell = new components.AppShell(services);
    appShell.mount(root);

    router.start();
  }

  function showFatalError(err) {
    var root = document.getElementById('app-root');
    if (!root) { return; }
    root.textContent = '';
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.margin = '48px auto';
    box.style.maxWidth = '480px';
    box.style.padding = '24px';
    box.style.fontFamily = 'sans-serif';
    box.style.border = '1px solid #b42318';
    box.style.borderRadius = '12px';
    box.style.background = '#fdecea';
    box.style.color = '#b42318';
    var title = document.createElement('h2');
    title.textContent = 'The application failed to start';
    var msg = document.createElement('p');
    msg.textContent = (err && err.message) || String(err);
    box.appendChild(title);
    box.appendChild(msg);
    root.appendChild(box);
    /* eslint-disable no-console */
    console.error('RCF boot failure:', err);
  }

  function start() {
    try {
      boot();
    } catch (err) {
      showFatalError(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
