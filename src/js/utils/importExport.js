/**
 * Import/export helpers. Operate on the same canonical state schema used
 * by the Store, so import simply replaces state after validation.
 */
(function (global) {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function todayStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /**
   * Triggers a browser download of the given state as a UTF-8 JSON file.
   */
  function exportState(state) {
    var json = JSON.stringify(state, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'role-capability-framework-' + todayStamp() + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /**
   * Reads a File, parses JSON, and performs minimal schema validation.
   * @param {File} file
   * @returns {Promise<{state: object, summary: object}>}
   */
  function readImportFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read the selected file.')); };
      reader.onload = function () {
        var parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch (e) {
          reject(new Error('The file is not valid JSON.'));
          return;
        }
        var validation = global.RCF.validation.validateImportedState(parsed);
        if (!validation.valid) {
          reject(new Error(validation.errors.join(' ')));
          return;
        }
        var summary = {
          frameworkName: parsed.meta && parsed.meta.frameworkName,
          schemaVersion: parsed.schemaVersion,
          domains: (parsed.domains || []).length,
          capabilities: (parsed.capabilities || []).length,
          roleFamilies: (parsed.roleFamilies || []).length,
          levels: (parsed.levels || []).length
        };
        resolve({ state: parsed, summary: summary });
      };
      reader.readAsText(file);
    });
  }

  global.RCF = global.RCF || {};
  global.RCF.importExport = {
    exportState: exportState,
    readImportFile: readImportFile
  };
})(window);
