/**
 * Validation and referential-integrity helpers.
 *
 * Two kinds of validation live here:
 *  1. Shallow "is this JSON shaped like our schema" checks used for import.
 *  2. Deep referential-integrity pruning used after import/reset so a
 *     corrupt or hand-edited file can never crash rendering (NFR-010).
 */
(function (global) {
  'use strict';

  var REQUIRED_TOP_LEVEL = ['schemaVersion', 'meta', 'levels', 'domains', 'capabilities',
    'roleFamilies', 'roleProfiles', 'referenceFrameworks', 'mappings'];

  /** Minimum shape check performed before an import is accepted (FR-094). */
  function validateImportedState(parsed) {
    var errors = [];
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, errors: ['The file does not contain a JSON object.'] };
    }
    if (typeof parsed.schemaVersion !== 'number') {
      errors.push('Missing or invalid "schemaVersion".');
    }
    REQUIRED_TOP_LEVEL.forEach(function (key) {
      if (!(key in parsed)) { errors.push('Missing required field "' + key + '".'); }
    });
    ['levels', 'domains', 'capabilities', 'roleFamilies', 'roleProfiles', 'referenceFrameworks', 'mappings']
      .forEach(function (key) {
        if (key in parsed && !Array.isArray(parsed[key])) {
          errors.push('Field "' + key + '" must be an array.');
        }
      });
    if (!parsed.meta || typeof parsed.meta !== 'object') {
      errors.push('Missing "meta" object.');
    } else if (!parsed.meta.frameworkName) {
      errors.push('"meta.frameworkName" is required.');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  /** Capability validation rules per FR-033. */
  function validateCapability(capability, state) {
    var errors = [];
    if (!capability.code || !String(capability.code).trim()) { errors.push('Code is required.'); }
    if (!capability.name || !String(capability.name).trim()) { errors.push('Name is required.'); }
    if (!capability.domainId || !state.domains.some(function (d) { return d.id === capability.domainId; })) {
      errors.push('Capability must reference an existing domain.');
    }
    if (capability.code) {
      var code = String(capability.code).trim().toLowerCase();
      var duplicate = state.capabilities.some(function (c) {
        return c.id !== capability.id && String(c.code || '').trim().toLowerCase() === code;
      });
      if (duplicate) { errors.push('Code must be unique (case-insensitive).'); }
    }
    var defs = capability.maturityDefinitions || [];
    if (defs.length === 0) { errors.push('At least one maturity definition is required to mark this capability complete.'); }
    defs.forEach(function (def) {
      if (!def.levelId || !state.levels.some(function (l) { return l.id === def.levelId; })) {
        errors.push('A maturity definition references a missing level.');
      }
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function validateDomain(domain) {
    var errors = [];
    if (!domain.name || !String(domain.name).trim()) { errors.push('Domain name is required.'); }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateRoleFamily(roleFamily) {
    var errors = [];
    if (!roleFamily.name || !String(roleFamily.name).trim()) { errors.push('Role family name is required.'); }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateCareerStage(stage) {
    var errors = [];
    if (!stage.title || !String(stage.title).trim()) { errors.push('Career stage title is required.'); }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateLevel(level) {
    var errors = [];
    if (!level.name || !String(level.name).trim()) { errors.push('Level name is required.'); }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateReferenceFramework(referenceFramework) {
    var errors = [];
    if (!referenceFramework.name || !String(referenceFramework.name).trim()) { errors.push('Reference framework name is required.'); }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateMapping(mapping) {
    var errors = [];
    if (!mapping.sourceType || ['capability', 'domain', 'careerStage'].indexOf(mapping.sourceType) === -1) {
      errors.push('A valid source type is required.');
    }
    if (!mapping.sourceId) { errors.push('A source item must be selected.'); }
    if (!mapping.referenceFrameworkId) { errors.push('A reference framework must be selected.'); }
    if (!(mapping.referenceCode && String(mapping.referenceCode).trim()) && !(mapping.referenceTitle && String(mapping.referenceTitle).trim())) {
      errors.push('Enter a reference code or reference title.');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * Removes/normalises dangling references so the app never throws while
   * rendering imported or hand-edited data (NFR-010). Mutates a shallow
   * clone and returns it; never mutates the input in place.
   */
  function pruneInvalidReferences(state) {
    var next = JSON.parse(JSON.stringify(state));
    var levelIds = {};
    next.levels.forEach(function (l) { levelIds[l.id] = true; });
    var domainIds = {};
    next.domains.forEach(function (d) { domainIds[d.id] = true; });

    // Domains: drop level descriptions for missing levels.
    next.domains.forEach(function (d) {
      if (!d.levelDescriptions) { d.levelDescriptions = {}; }
      Object.keys(d.levelDescriptions).forEach(function (levelId) {
        if (!levelIds[levelId]) { delete d.levelDescriptions[levelId]; }
      });
    });

    // Capabilities: drop refs to missing domains entirely (can't render an
    // orphaned capability); drop maturity definitions for missing levels.
    next.capabilities = next.capabilities.filter(function (c) { return domainIds[c.domainId]; });
    var capabilityIds = {};
    next.capabilities.forEach(function (c) {
      capabilityIds[c.id] = true;
      c.maturityDefinitions = (c.maturityDefinitions || []).filter(function (def) { return levelIds[def.levelId]; });
    });

    // Role families / stages: collect valid ids for profile pruning.
    var stageIds = {};
    var familyIds = {};
    next.roleFamilies.forEach(function (f) {
      familyIds[f.id] = true;
      (f.careerStages || []).forEach(function (s) { stageIds[s.id] = true; });
    });

    next.roleProfiles = next.roleProfiles.filter(function (p) {
      return familyIds[p.roleFamilyId] && stageIds[p.careerStageId];
    });
    next.roleProfiles.forEach(function (p) {
      var targets = p.domainTargets || {};
      Object.keys(targets).forEach(function (domainId) {
        if (!domainIds[domainId] || !levelIds[targets[domainId]]) { delete targets[domainId]; }
      });
      p.domainTargets = targets;
      var overrides = p.capabilityOverrides || {};
      Object.keys(overrides).forEach(function (capId) {
        if (!capabilityIds[capId]) { delete overrides[capId]; return; }
        var ov = overrides[capId];
        if (ov.targetLevelId && !levelIds[ov.targetLevelId]) { ov.targetLevelId = null; }
      });
      p.capabilityOverrides = overrides;
    });

    // Reference frameworks + mappings.
    var refFrameworkIds = {};
    (next.referenceFrameworks || []).forEach(function (r) { refFrameworkIds[r.id] = true; });
    next.mappings = (next.mappings || []).filter(function (m) {
      if (m.referenceFrameworkId && !refFrameworkIds[m.referenceFrameworkId]) { return false; }
      if (m.sourceType === 'capability') { return !!capabilityIds[m.sourceId]; }
      if (m.sourceType === 'domain') { return !!domainIds[m.sourceId]; }
      if (m.sourceType === 'careerStage') { return !!stageIds[m.sourceId]; }
      return false;
    });

    return next;
  }

  global.RCF = global.RCF || {};
  global.RCF.validation = {
    validateImportedState: validateImportedState,
    validateCapability: validateCapability,
    validateDomain: validateDomain,
    validateRoleFamily: validateRoleFamily,
    validateCareerStage: validateCareerStage,
    validateLevel: validateLevel,
    validateReferenceFramework: validateReferenceFramework,
    validateMapping: validateMapping,
    pruneInvalidReferences: pruneInvalidReferences
  };
})(window);
