/**
 * Central application Store.
 *
 * All state-changing actions flow through `dispatch()` and a single
 * reducer function. Components must never mutate `store.getState()`
 * results directly - always dispatch an action instead (FR-090).
 */
(function (global) {
  'use strict';

  var generateId = global.RCF.utils.generateId;

  function nowIso() { return new Date().toISOString(); }

  function nextOrder(list) {
    return list.reduce(function (max, item) { return Math.max(max, item.order || 0); }, 0) + 1;
  }

  /** Swaps `order` between an item and its immediate neighbour in `direction`. */
  function moveOrder(list, id, direction) {
    var sorted = list.slice().sort(function (a, b) { return a.order - b.order; });
    var idx = sorted.findIndex(function (item) { return item.id === id; });
    if (idx === -1) { return list; }
    var swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) { return list; }
    var a = sorted[idx];
    var b = sorted[swapIdx];
    var aOrder = a.order;
    a.order = b.order;
    b.order = aOrder;
    return list.map(function (item) {
      if (item.id === a.id) { return Object.assign({}, item, { order: a.order }); }
      if (item.id === b.id) { return Object.assign({}, item, { order: b.order }); }
      return item;
    });
  }

  function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }

  function reduce(state, action) {
    var type = action.type;
    var payload = action.payload || {};

    switch (type) {
      case 'META_UPDATE': {
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, payload.patch) });
      }

      // ---------------------------------------------------------- LEVELS
      case 'LEVEL_ADD': {
        var newLevel = Object.assign({
          id: generateId('level'),
          name: 'New Level',
          shortLabel: '',
          description: '',
          order: nextOrder(state.levels)
        }, payload.level);
        return Object.assign({}, state, { levels: state.levels.concat(newLevel) });
      }
      case 'LEVEL_UPDATE': {
        return Object.assign({}, state, {
          levels: state.levels.map(function (l) { return l.id === payload.id ? Object.assign({}, l, payload.patch) : l; })
        });
      }
      case 'LEVEL_MOVE': {
        return Object.assign({}, state, { levels: moveOrder(state.levels, payload.id, payload.direction) });
      }
      case 'LEVEL_DELETE': {
        var levelId = payload.id;
        var domains = state.domains.map(function (d) {
          if (!d.levelDescriptions || !(levelId in d.levelDescriptions)) { return d; }
          var ld = Object.assign({}, d.levelDescriptions);
          delete ld[levelId];
          return Object.assign({}, d, { levelDescriptions: ld });
        });
        var capabilities = state.capabilities.map(function (c) {
          var defs = (c.maturityDefinitions || []).filter(function (def) { return def.levelId !== levelId; });
          if (defs.length === (c.maturityDefinitions || []).length) { return c; }
          return Object.assign({}, c, { maturityDefinitions: defs });
        });
        var roleProfiles = state.roleProfiles.map(function (p) {
          var targets = Object.assign({}, p.domainTargets);
          Object.keys(targets).forEach(function (domainId) { if (targets[domainId] === levelId) { delete targets[domainId]; } });
          var overrides = cloneJson(p.capabilityOverrides || {});
          Object.keys(overrides).forEach(function (capId) {
            if (overrides[capId].targetLevelId === levelId) { overrides[capId].targetLevelId = null; }
          });
          return Object.assign({}, p, { domainTargets: targets, capabilityOverrides: overrides });
        });
        return Object.assign({}, state, {
          levels: state.levels.filter(function (l) { return l.id !== levelId; }),
          domains: domains,
          capabilities: capabilities,
          roleProfiles: roleProfiles
        });
      }

      // --------------------------------------------------------- DOMAINS
      case 'DOMAIN_ADD': {
        var newDomain = Object.assign({
          id: generateId('domain'),
          name: 'New Domain',
          shortCode: '',
          description: '',
          colour: '#3659d9',
          order: nextOrder(state.domains),
          levelDescriptions: {}
        }, payload.domain);
        return Object.assign({}, state, { domains: state.domains.concat(newDomain) });
      }
      case 'DOMAIN_UPDATE': {
        return Object.assign({}, state, {
          domains: state.domains.map(function (d) { return d.id === payload.id ? Object.assign({}, d, payload.patch) : d; })
        });
      }
      case 'DOMAIN_MOVE': {
        return Object.assign({}, state, { domains: moveOrder(state.domains, payload.id, payload.direction) });
      }
      case 'DOMAIN_SET_LEVEL_DESCRIPTION': {
        return Object.assign({}, state, {
          domains: state.domains.map(function (d) {
            if (d.id !== payload.domainId) { return d; }
            var ld = Object.assign({}, d.levelDescriptions);
            ld[payload.levelId] = payload.text;
            return Object.assign({}, d, { levelDescriptions: ld });
          })
        });
      }
      case 'DOMAIN_DELETE': {
        var domainId = payload.id;
        var removedCapIds = {};
        state.capabilities.forEach(function (c) { if (c.domainId === domainId) { removedCapIds[c.id] = true; } });
        var remainingCapabilities = state.capabilities.filter(function (c) { return c.domainId !== domainId; });
        var profilesAfterDomain = state.roleProfiles.map(function (p) {
          var targets = Object.assign({}, p.domainTargets);
          delete targets[domainId];
          var overrides = cloneJson(p.capabilityOverrides || {});
          Object.keys(overrides).forEach(function (capId) { if (removedCapIds[capId]) { delete overrides[capId]; } });
          return Object.assign({}, p, { domainTargets: targets, capabilityOverrides: overrides });
        });
        var mappingsAfterDomain = state.mappings.filter(function (m) {
          if (m.sourceType === 'domain' && m.sourceId === domainId) { return false; }
          if (m.sourceType === 'capability' && removedCapIds[m.sourceId]) { return false; }
          return true;
        });
        return Object.assign({}, state, {
          domains: state.domains.filter(function (d) { return d.id !== domainId; }),
          capabilities: remainingCapabilities,
          roleProfiles: profilesAfterDomain,
          mappings: mappingsAfterDomain
        });
      }

      // ----------------------------------------------------- CAPABILITIES
      case 'CAPABILITY_ADD': {
        var newCap = Object.assign({
          id: generateId('cap'),
          domainId: null,
          code: '',
          name: '',
          description: '',
          mode: 'milestone',
          tags: [],
          order: nextOrder(state.capabilities.filter(function (c) { return c.domainId === payload.capability.domainId; })),
          maturityDefinitions: []
        }, payload.capability);
        return Object.assign({}, state, { capabilities: state.capabilities.concat(newCap) });
      }
      case 'CAPABILITY_UPDATE': {
        return Object.assign({}, state, {
          capabilities: state.capabilities.map(function (c) { return c.id === payload.id ? Object.assign({}, c, payload.patch) : c; })
        });
      }
      case 'CAPABILITY_MOVE': {
        var domainCaps = state.capabilities.filter(function (c) { return c.domainId === payload.domainId; });
        var moved = moveOrder(domainCaps, payload.id, payload.direction);
        var movedById = {};
        moved.forEach(function (c) { movedById[c.id] = c; });
        return Object.assign({}, state, {
          capabilities: state.capabilities.map(function (c) { return movedById[c.id] || c; })
        });
      }
      case 'CAPABILITY_DELETE': {
        var capId = payload.id;
        var profilesAfterCap = state.roleProfiles.map(function (p) {
          if (!p.capabilityOverrides || !(capId in p.capabilityOverrides)) { return p; }
          var overrides = Object.assign({}, p.capabilityOverrides);
          delete overrides[capId];
          return Object.assign({}, p, { capabilityOverrides: overrides });
        });
        var mappingsAfterCap = state.mappings.filter(function (m) { return !(m.sourceType === 'capability' && m.sourceId === capId); });
        return Object.assign({}, state, {
          capabilities: state.capabilities.filter(function (c) { return c.id !== capId; }),
          roleProfiles: profilesAfterCap,
          mappings: mappingsAfterCap
        });
      }
      case 'CAPABILITY_ADD_MATURITY_DEF': {
        return Object.assign({}, state, {
          capabilities: state.capabilities.map(function (c) {
            if (c.id !== payload.capabilityId) { return c; }
            return Object.assign({}, c, { maturityDefinitions: (c.maturityDefinitions || []).concat(payload.def) });
          })
        });
      }
      case 'CAPABILITY_UPDATE_MATURITY_DEF': {
        return Object.assign({}, state, {
          capabilities: state.capabilities.map(function (c) {
            if (c.id !== payload.capabilityId) { return c; }
            return Object.assign({}, c, {
              maturityDefinitions: (c.maturityDefinitions || []).map(function (def) {
                return def.levelId === payload.levelId ? Object.assign({}, def, payload.patch) : def;
              })
            });
          })
        });
      }
      case 'CAPABILITY_REMOVE_MATURITY_DEF': {
        return Object.assign({}, state, {
          capabilities: state.capabilities.map(function (c) {
            if (c.id !== payload.capabilityId) { return c; }
            return Object.assign({}, c, {
              maturityDefinitions: (c.maturityDefinitions || []).filter(function (def) { return def.levelId !== payload.levelId; })
            });
          })
        });
      }

      // ---------------------------------------------------- ROLE FAMILIES
      case 'ROLE_FAMILY_ADD': {
        var newFamily = Object.assign({
          id: generateId('role-family'),
          name: 'New Role Family',
          description: '',
          colour: '#2563EB',
          order: nextOrder(state.roleFamilies),
          careerStages: []
        }, payload.roleFamily);
        return Object.assign({}, state, { roleFamilies: state.roleFamilies.concat(newFamily) });
      }
      case 'ROLE_FAMILY_UPDATE': {
        return Object.assign({}, state, {
          roleFamilies: state.roleFamilies.map(function (f) { return f.id === payload.id ? Object.assign({}, f, payload.patch) : f; })
        });
      }
      case 'ROLE_FAMILY_MOVE': {
        return Object.assign({}, state, { roleFamilies: moveOrder(state.roleFamilies, payload.id, payload.direction) });
      }
      case 'ROLE_FAMILY_DELETE': {
        var familyId = payload.id;
        var family = state.roleFamilies.find(function (f) { return f.id === familyId; });
        var stageIds = {};
        (family ? family.careerStages : []).forEach(function (s) { stageIds[s.id] = true; });
        return Object.assign({}, state, {
          roleFamilies: state.roleFamilies.filter(function (f) { return f.id !== familyId; }),
          roleProfiles: state.roleProfiles.filter(function (p) { return p.roleFamilyId !== familyId; }),
          mappings: state.mappings.filter(function (m) { return !(m.sourceType === 'careerStage' && stageIds[m.sourceId]); })
        });
      }

      // ---------------------------------------------------- CAREER STAGES
      case 'ROLE_STAGE_ADD': {
        var stage = Object.assign({
          id: generateId('stage'),
          title: 'New Stage',
          shortTitle: '',
          description: ''
        }, payload.stage);
        var families = state.roleFamilies.map(function (f) {
          if (f.id !== payload.roleFamilyId) { return f; }
          stage.order = nextOrder(f.careerStages || []);
          return Object.assign({}, f, { careerStages: (f.careerStages || []).concat(stage) });
        });
        var newProfile = {
          id: generateId('profile'),
          roleFamilyId: payload.roleFamilyId,
          careerStageId: stage.id,
          domainTargets: {},
          capabilityOverrides: {}
        };
        return Object.assign({}, state, { roleFamilies: families, roleProfiles: state.roleProfiles.concat(newProfile) });
      }
      case 'ROLE_STAGE_UPDATE': {
        return Object.assign({}, state, {
          roleFamilies: state.roleFamilies.map(function (f) {
            if (f.id !== payload.roleFamilyId) { return f; }
            return Object.assign({}, f, {
              careerStages: f.careerStages.map(function (s) { return s.id === payload.stageId ? Object.assign({}, s, payload.patch) : s; })
            });
          })
        });
      }
      case 'ROLE_STAGE_MOVE': {
        return Object.assign({}, state, {
          roleFamilies: state.roleFamilies.map(function (f) {
            if (f.id !== payload.roleFamilyId) { return f; }
            return Object.assign({}, f, { careerStages: moveOrder(f.careerStages, payload.stageId, payload.direction) });
          })
        });
      }
      case 'ROLE_STAGE_DELETE': {
        var rfId = payload.roleFamilyId;
        var stgId = payload.stageId;
        return Object.assign({}, state, {
          roleFamilies: state.roleFamilies.map(function (f) {
            if (f.id !== rfId) { return f; }
            return Object.assign({}, f, { careerStages: f.careerStages.filter(function (s) { return s.id !== stgId; }) });
          }),
          roleProfiles: state.roleProfiles.filter(function (p) { return !(p.roleFamilyId === rfId && p.careerStageId === stgId); }),
          mappings: state.mappings.filter(function (m) { return !(m.sourceType === 'careerStage' && m.sourceId === stgId); })
        });
      }

      // ----------------------------------------------------- ROLE PROFILE
      case 'ROLE_PROFILE_SET_DOMAIN_TARGET': {
        return Object.assign({}, state, {
          roleProfiles: state.roleProfiles.map(function (p) {
            if (p.roleFamilyId !== payload.roleFamilyId || p.careerStageId !== payload.careerStageId) { return p; }
            var targets = Object.assign({}, p.domainTargets);
            if (payload.levelId) { targets[payload.domainId] = payload.levelId; } else { delete targets[payload.domainId]; }
            return Object.assign({}, p, { domainTargets: targets });
          })
        });
      }
      case 'ROLE_PROFILE_SET_OVERRIDE': {
        return Object.assign({}, state, {
          roleProfiles: state.roleProfiles.map(function (p) {
            if (p.roleFamilyId !== payload.roleFamilyId || p.careerStageId !== payload.careerStageId) { return p; }
            var overrides = Object.assign({}, p.capabilityOverrides);
            overrides[payload.capabilityId] = payload.override;
            return Object.assign({}, p, { capabilityOverrides: overrides });
          })
        });
      }
      case 'ROLE_PROFILE_REMOVE_OVERRIDE': {
        return Object.assign({}, state, {
          roleProfiles: state.roleProfiles.map(function (p) {
            if (p.roleFamilyId !== payload.roleFamilyId || p.careerStageId !== payload.careerStageId) { return p; }
            var overrides = Object.assign({}, p.capabilityOverrides);
            delete overrides[payload.capabilityId];
            return Object.assign({}, p, { capabilityOverrides: overrides });
          })
        });
      }
      case 'ROLE_PROFILE_COPY': {
        var source = state.roleProfiles.find(function (p) {
          return p.roleFamilyId === payload.fromRoleFamilyId && p.careerStageId === payload.fromCareerStageId;
        });
        if (!source) { return state; }
        return Object.assign({}, state, {
          roleProfiles: state.roleProfiles.map(function (p) {
            if (p.roleFamilyId !== payload.toRoleFamilyId || p.careerStageId !== payload.toCareerStageId) { return p; }
            return Object.assign({}, p, {
              domainTargets: cloneJson(source.domainTargets || {}),
              capabilityOverrides: cloneJson(source.capabilityOverrides || {})
            });
          })
        });
      }

      // ----------------------------------------------- REFERENCE FRAMEWORKS
      case 'REFERENCE_FRAMEWORK_ADD': {
        var newRef = Object.assign({
          id: generateId('reference'),
          name: 'Custom Reference',
          type: 'custom',
          version: '',
          levels: [],
          areas: []
        }, payload.referenceFramework);
        return Object.assign({}, state, { referenceFrameworks: state.referenceFrameworks.concat(newRef) });
      }
      case 'REFERENCE_FRAMEWORK_UPDATE': {
        return Object.assign({}, state, {
          referenceFrameworks: state.referenceFrameworks.map(function (r) { return r.id === payload.id ? Object.assign({}, r, payload.patch) : r; })
        });
      }
      case 'REFERENCE_FRAMEWORK_DELETE': {
        return Object.assign({}, state, {
          referenceFrameworks: state.referenceFrameworks.filter(function (r) { return r.id !== payload.id; }),
          mappings: state.mappings.filter(function (m) { return m.referenceFrameworkId !== payload.id; })
        });
      }

      // ------------------------------------------------------------ MAPPINGS
      case 'MAPPING_ADD': {
        var newMapping = Object.assign({
          id: generateId('mapping'),
          sourceType: 'capability',
          sourceId: null,
          referenceFrameworkId: null,
          referenceCode: '',
          referenceTitle: '',
          referenceLevel: '',
          relationship: 'closely-related',
          confidence: 'medium',
          notes: '',
          sourceUrl: ''
        }, payload.mapping);
        return Object.assign({}, state, { mappings: state.mappings.concat(newMapping) });
      }
      case 'MAPPING_UPDATE': {
        return Object.assign({}, state, {
          mappings: state.mappings.map(function (m) { return m.id === payload.id ? Object.assign({}, m, payload.patch) : m; })
        });
      }
      case 'MAPPING_DELETE': {
        return Object.assign({}, state, { mappings: state.mappings.filter(function (m) { return m.id !== payload.id; }) });
      }

      // -------------------------------------------------------------- APP
      case 'APP_IMPORT_STATE': {
        return Object.assign({}, payload.state);
      }
      case 'APP_RESET_DEMO': {
        return Object.assign({}, payload.state);
      }

      default:
        return state;
    }
  }

  function Store(initialState) {
    this.state = initialState;
    this.listeners = [];
  }

  Store.prototype.getState = function () { return this.state; };

  Store.prototype.subscribe = function (listener) {
    this.listeners.push(listener);
    var self = this;
    return function () {
      var idx = self.listeners.indexOf(listener);
      if (idx !== -1) { self.listeners.splice(idx, 1); }
    };
  };

  Store.prototype.dispatch = function (action) {
    var prev = this.state;
    var next = reduce(this.state, action);
    if (next === prev) { return; }
    if (action.type !== 'APP_IMPORT_STATE' && action.type !== 'APP_RESET_DEMO') {
      next = Object.assign({}, next, { meta: Object.assign({}, next.meta, { updatedAt: nowIso() }) });
    }
    this.state = next;
    this.listeners.slice().forEach(function (listener) { listener(next, action); });
  };

  Store.prototype.replaceState = function (newState) {
    this.dispatch({ type: 'APP_IMPORT_STATE', payload: { state: newState } });
  };

  global.RCF = global.RCF || {};
  global.RCF.core = global.RCF.core || {};
  global.RCF.core.Store = Store;
  // Exposed for unit-style manual testing in the console if needed.
  global.RCF.core.reduce = reduce;
})(window);
