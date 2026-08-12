/**
 * Framework Builder top-level view (section 18.3): two sub-tabs,
 * "Levels and Domains" (LevelEditor + DomainEditor's list/ladder) and
 * "Capabilities" (flat filterable CapabilityEditor list). Both panels stay
 * mounted; switching tabs only toggles visibility so neither sub-component
 * loses its local UI state (e.g. which domain's ladder is open).
 */
(function (global) {
  'use strict';

  var el = global.RCF.utils.el;
  var clear = global.RCF.utils.clear;

  function FrameworkEditor(services) {
    this.services = services;
    this.container = null;
    this.activeTab = 'levels-domains';
    this.levelsDomainsPane = null;
    this.capabilitiesPane = null;
    this.levelEditor = new global.RCF.components.LevelEditor(services);
    this.domainEditor = new global.RCF.components.DomainEditor(services);
    this.capabilityEditor = new global.RCF.components.CapabilityEditor(services);
  }

  FrameworkEditor.prototype.mount = function (container) {
    this.container = container;
    var self = this;

    var tabBar = el('div', { className: 'tab-bar', role: 'tablist' });
    var tabLevelsDomains = el('button', {
      type: 'button', className: 'tab-button', role: 'tab', text: 'Levels and Domains',
      on: { click: function () { self.setActiveTab('levels-domains'); } }
    });
    var tabCapabilities = el('button', {
      type: 'button', className: 'tab-button', role: 'tab', text: 'Capabilities',
      on: { click: function () { self.setActiveTab('capabilities'); } }
    });
    tabBar.appendChild(tabLevelsDomains);
    tabBar.appendChild(tabCapabilities);
    this.tabLevelsDomains = tabLevelsDomains;
    this.tabCapabilities = tabCapabilities;
    container.appendChild(tabBar);

    this.levelsDomainsPane = el('div', { className: 'tab-panel' });
    this.capabilitiesPane = el('div', { className: 'tab-panel' });
    container.appendChild(this.levelsDomainsPane);
    container.appendChild(this.capabilitiesPane);

    var levelsContainer = el('div');
    var domainsContainer = el('div');
    this.levelsDomainsPane.appendChild(levelsContainer);
    this.levelsDomainsPane.appendChild(domainsContainer);
    this.levelEditor.mount(levelsContainer);
    this.domainEditor.mount(domainsContainer);
    this.capabilityEditor.mount(this.capabilitiesPane);

    this.updateTabVisibility();
  };

  FrameworkEditor.prototype.setActiveTab = function (tab) {
    this.activeTab = tab;
    this.updateTabVisibility();
  };

  FrameworkEditor.prototype.updateTabVisibility = function () {
    var isLevelsDomains = this.activeTab === 'levels-domains';
    this.levelsDomainsPane.classList.toggle('hidden', !isLevelsDomains);
    this.capabilitiesPane.classList.toggle('hidden', isLevelsDomains);
    this.tabLevelsDomains.classList.toggle('tab-button-active', isLevelsDomains);
    this.tabCapabilities.classList.toggle('tab-button-active', !isLevelsDomains);
    this.tabLevelsDomains.setAttribute('aria-selected', isLevelsDomains ? 'true' : 'false');
    this.tabCapabilities.setAttribute('aria-selected', !isLevelsDomains ? 'true' : 'false');
  };

  FrameworkEditor.prototype.render = function (state) {
    if (!this.container) { return; }
    this.levelEditor.render(state);
    this.domainEditor.render(state);
    this.capabilityEditor.render(state);
  };

  FrameworkEditor.prototype.destroy = function () {
    this.levelEditor.destroy();
    this.domainEditor.destroy();
    this.capabilityEditor.destroy();
    if (this.container) { clear(this.container); }
    this.container = null;
  };

  global.RCF = global.RCF || {};
  global.RCF.components = global.RCF.components || {};
  global.RCF.components.FrameworkEditor = FrameworkEditor;
})(window);
