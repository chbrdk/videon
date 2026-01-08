// CSInterface.js - Adobe CEP Bridge
// This file provides the interface between CEP and ExtendScript

(function() {
  'use strict';
  
  function CSInterface() {
    // CEP environment check
    if (typeof window.__adobe_cep__ !== 'undefined') {
      this.extensionId = window.__adobe_cep__.getExtensionId();
      this.hostVersion = this.getHostVersion();
    } else {
      this.hostVersion = '25.0';
    }
  }

  CSInterface.prototype = {
    evalScript: function(script, callback) {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          // Real CEP environment
          window.__adobe_cep__.evalScript(script, function(result) {
            if (callback) {
              callback(result);
            }
          });
        } else if (typeof cep !== 'undefined' && cep.evalScript) {
          // Alternative CEP API
          cep.evalScript(script, function(result) {
            if (callback) {
              callback(result);
            }
          });
        } else {
          // Development fallback
          console.log('CSInterface.evalScript (dev mode):', script);
          if (callback) {
            setTimeout(function() {
              callback('success');
            }, 100);
          }
        }
      } catch (e) {
        console.error('CSInterface.evalScript error:', e);
        if (callback) {
          callback('Error: ' + e.toString());
        }
      }
    },
    
    addEventListener: function(type, callback) {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          window.__adobe_cep__.addEventListener(type, callback);
        } else {
          console.log('CSInterface.addEventListener (dev mode):', type);
        }
      } catch (e) {
        console.error('CSInterface.addEventListener error:', e);
      }
    },
    
    getHostEnvironment: function() {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          return window.__adobe_cep__.getHostEnvironment();
        } else {
          return JSON.stringify({
            appName: 'AEFT',
            appVersion: '25.0',
            apiVersion: '11.0'
          });
        }
      } catch (e) {
        return JSON.stringify({
          appName: 'AEFT',
          appVersion: '25.0'
        });
      }
    },
    
    getHostVersion: function() {
      try {
        var hostEnv = JSON.parse(this.getHostEnvironment());
        return hostEnv.appVersion || '25.0';
      } catch (e) {
        return '25.0';
      }
    },
    
    getExtensionPath: function() {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          return window.__adobe_cep__.getExtensionPath();
        }
      } catch (e) {}
      return '';
    },
    
    requestExtension: function(extensionId) {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          window.__adobe_cep__.requestExtension(extensionId);
        } else {
          console.log('CSInterface.requestExtension (dev mode):', extensionId);
        }
      } catch (e) {
        console.error('CSInterface.requestExtension error:', e);
      }
    },
    
    resizeContent: function(width, height) {
      try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
          window.__adobe_cep__.resizeContent(width, height);
        } else {
          console.log('CSInterface.resizeContent (dev mode):', width, height);
        }
      } catch (e) {
        console.error('CSInterface.resizeContent error:', e);
      }
    }
  };

  // Export CSInterface globally
  if (typeof window !== 'undefined') {
    window.CSInterface = CSInterface;
  }
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSInterface;
  }
})();
