// CSInterface.js - Adobe CEP Bridge
// Simplified version for After Effects

function CSInterface() {
  this.hostVersion = '25.5';
}

CSInterface.prototype = {
  evalScript: function(script) {
    try {
      var result = app.evalScript(script);
      return result;
    } catch (e) {
      return 'Error: ' + e.toString();
    }
  },
  
  getHostEnvironment: function() {
    return JSON.stringify({
      appName: 'AEFT',
      appVersion: '25.5'
    });
  }
};

// Mock app object if not available
if (typeof app === 'undefined') {
  window.app = {
    evalScript: function(script) {
      console.warn('app.evalScript not available:', script);
      return 'Error: Not in After Effects context';
    }
  };
}

