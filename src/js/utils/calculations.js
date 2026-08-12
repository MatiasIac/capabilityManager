/**
 * Pure calculation helpers used across visualisations and role-overlay
 * logic. Kept free of any DOM/SVG rendering concerns so chart components
 * only need to draw the numbers produced here.
 */
(function (global) {
  'use strict';

  /** Returns the numeric order for a level id, or null if not found. */
  function getLevelOrder(levelId, state) {
    if (!levelId) { return null; }
    var level = state.levels.find(function (l) { return l.id === levelId; });
    return level ? level.order : null;
  }

  function getLevelById(levelId, state) {
    return state.levels.find(function (l) { return l.id === levelId; }) || null;
  }

  /** Highest configured level order (0 if no levels exist). */
  function getMaxLevelOrder(state) {
    return state.levels.reduce(function (max, l) { return Math.max(max, l.order); }, 0);
  }

  function getDomainById(domainId, state) {
    return state.domains.find(function (d) { return d.id === domainId; }) || null;
  }

  function getCapabilityById(capId, state) {
    return state.capabilities.find(function (c) { return c.id === capId; }) || null;
  }

  /**
   * Resolves the effective target for one capability under a role profile.
   * Step 1 of FR-044: an explicit override always wins over the domain target.
   * @returns {{source: 'override'|'domain'|'none', status: string, targetLevelId: string|null}}
   */
  function getEffectiveCapabilityTarget(profile, capability, state) {
    var overrides = (profile && profile.capabilityOverrides) || {};
    var override = overrides[capability.id];
    if (override) {
      if (override.status === 'excluded') {
        return { source: 'override', status: 'excluded', targetLevelId: override.targetLevelId || null };
      }
      var targetLevelId = override.targetLevelId || null;
      if (!targetLevelId) {
        targetLevelId = (profile.domainTargets && profile.domainTargets[capability.domainId]) || null;
      }
      return { source: 'override', status: override.status || 'required', targetLevelId: targetLevelId };
    }
    var domainTargetLevelId = (profile && profile.domainTargets && profile.domainTargets[capability.domainId]) || null;
    if (!domainTargetLevelId) {
      return { source: 'none', status: 'not-set', targetLevelId: null };
    }
    return { source: 'domain', status: 'required', targetLevelId: domainTargetLevelId };
  }

  /**
   * Full FR-044 effective-inclusion logic for the Capability Map role overlay.
   * @returns {{
   *   included: boolean,
   *   reason: string,
   *   matchedLevelId: (string|null),
   *   targetLevelId: (string|null),
   *   isOverride: boolean,
   *   status: string
   * }}
   */
  function getRoleOverlayState(profile, capability, state) {
    var effective = getEffectiveCapabilityTarget(profile, capability, state);
    var isOverride = effective.source === 'override';
    if (effective.status === 'excluded') {
      return { included: false, reason: 'excluded', matchedLevelId: null, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: 'excluded' };
    }
    if (!effective.targetLevelId) {
      return { included: false, reason: 'not-set', matchedLevelId: null, targetLevelId: null, isOverride: isOverride, status: effective.status };
    }
    var targetOrder = getLevelOrder(effective.targetLevelId, state);
    if (targetOrder === null) {
      return { included: false, reason: 'invalid-target', matchedLevelId: null, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
    }
    if (capability.mode === 'progressive') {
      var best = null;
      var bestOrder = -1;
      (capability.maturityDefinitions || []).forEach(function (def) {
        var order = getLevelOrder(def.levelId, state);
        if (order !== null && order <= targetOrder && order > bestOrder) {
          bestOrder = order;
          best = def;
        }
      });
      if (!best) {
        return { included: false, reason: 'below-target', matchedLevelId: null, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
      }
      return { included: true, reason: 'in-scope', matchedLevelId: best.levelId, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
    }
    // Milestone mode: use its single (first) maturity definition.
    var def0 = (capability.maturityDefinitions || [])[0];
    if (!def0) {
      return { included: false, reason: 'no-definition', matchedLevelId: null, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
    }
    var defOrder = getLevelOrder(def0.levelId, state);
    if (defOrder === null || defOrder > targetOrder) {
      return { included: false, reason: 'above-target', matchedLevelId: def0.levelId, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
    }
    return { included: true, reason: 'in-scope', matchedLevelId: def0.levelId, targetLevelId: effective.targetLevelId, isOverride: isOverride, status: effective.status };
  }

  /**
   * Normalises a domain's target level for a role profile into a 0-100 score
   * for radar/heatmap drawing. Falls back to an inferred average of any
   * explicit, non-excluded capability overrides within the domain (FR-070).
   */
  function getDomainTargetScore(profile, domainId, state) {
    var maxOrder = getMaxLevelOrder(state);
    var domainTargetLevelId = profile && profile.domainTargets ? profile.domainTargets[domainId] : null;
    if (domainTargetLevelId) {
      var order = getLevelOrder(domainTargetLevelId, state);
      if (order !== null) {
        return {
          order: order,
          value: maxOrder ? (order / maxOrder * 100) : 0,
          inferred: false,
          notSet: false,
          levelId: domainTargetLevelId
        };
      }
    }
    var overrides = (profile && profile.capabilityOverrides) || {};
    var relevantOrders = [];
    Object.keys(overrides).forEach(function (capId) {
      var override = overrides[capId];
      var cap = getCapabilityById(capId, state);
      if (cap && cap.domainId === domainId && override.status !== 'excluded' && override.targetLevelId) {
        var o = getLevelOrder(override.targetLevelId, state);
        if (o !== null) { relevantOrders.push(o); }
      }
    });
    if (relevantOrders.length) {
      var avg = relevantOrders.reduce(function (a, b) { return a + b; }, 0) / relevantOrders.length;
      return {
        order: avg,
        value: maxOrder ? (avg / maxOrder * 100) : 0,
        inferred: true,
        notSet: false,
        levelId: null
      };
    }
    return { order: 0, value: 0, inferred: false, notSet: true, levelId: null };
  }

  /** Percentage (0-100, rounded) of capabilities that have at least one mapping. */
  function getMappingCoverage(state) {
    var total = state.capabilities.length;
    if (!total) { return 0; }
    var mappedIds = {};
    state.mappings.forEach(function (m) {
      if (m.sourceType === 'capability') { mappedIds[m.sourceId] = true; }
    });
    var mappedCount = 0;
    state.capabilities.forEach(function (c) { if (mappedIds[c.id]) { mappedCount += 1; } });
    return Math.round((mappedCount / total) * 100);
  }

  /** Number of mappings referencing a given internal entity. */
  function getMappingCountFor(sourceType, sourceId, state) {
    return state.mappings.filter(function (m) { return m.sourceType === sourceType && m.sourceId === sourceId; }).length;
  }

  /** Returns capabilities belonging to a domain, sorted by order. */
  function getCapabilitiesForDomain(domainId, state) {
    return state.capabilities
      .filter(function (c) { return c.domainId === domainId; })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /** Sorted copies of core collections, since arrays in state are not guaranteed sorted. */
  function getSortedLevels(state) {
    return state.levels.slice().sort(function (a, b) { return a.order - b.order; });
  }
  function getSortedDomains(state) {
    return state.domains.slice().sort(function (a, b) { return a.order - b.order; });
  }
  function getSortedCareerStages(roleFamily) {
    return (roleFamily.careerStages || []).slice().sort(function (a, b) { return a.order - b.order; });
  }
  function getSortedRoleFamilies(state) {
    return state.roleFamilies.slice().sort(function (a, b) { return a.order - b.order; });
  }

  function getRoleProfile(roleFamilyId, careerStageId, state) {
    return state.roleProfiles.find(function (p) {
      return p.roleFamilyId === roleFamilyId && p.careerStageId === careerStageId;
    }) || null;
  }

  /** Whether a capability is considered "complete" per FR-033. */
  function isCapabilityComplete(capability) {
    return !!(capability.code && capability.name && capability.domainId &&
      capability.maturityDefinitions && capability.maturityDefinitions.length > 0);
  }

  global.RCF = global.RCF || {};
  global.RCF.calculations = {
    getLevelOrder: getLevelOrder,
    getLevelById: getLevelById,
    getMaxLevelOrder: getMaxLevelOrder,
    getDomainById: getDomainById,
    getCapabilityById: getCapabilityById,
    getEffectiveCapabilityTarget: getEffectiveCapabilityTarget,
    getRoleOverlayState: getRoleOverlayState,
    getDomainTargetScore: getDomainTargetScore,
    getMappingCoverage: getMappingCoverage,
    getMappingCountFor: getMappingCountFor,
    getCapabilitiesForDomain: getCapabilitiesForDomain,
    getSortedLevels: getSortedLevels,
    getSortedDomains: getSortedDomains,
    getSortedCareerStages: getSortedCareerStages,
    getSortedRoleFamilies: getSortedRoleFamilies,
    getRoleProfile: getRoleProfile,
    isCapabilityComplete: isCapabilityComplete
  };
})(window);
