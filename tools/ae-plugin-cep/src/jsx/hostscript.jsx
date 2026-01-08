// PrismVid Scene Search - ExtendScript Layer
// WICHTIG: ES3 JavaScript - keine modernen Features!
// #target aftereffects

function importScenes(dataString) {
  try {
    // Parse JSON (falls json2.js vorhanden)
    var data;
    if (typeof JSON !== 'undefined' && JSON.parse) {
      data = JSON.parse(dataString);
    } else {
      // Fallback für ES3
      var jsonParser = {
        parse: function(jsonStr) {
          return eval('(' + jsonStr + ')');
        }
      };
      data = jsonParser.parse(dataString);
    }
    
    var scenes = data.scenes;
    var options = data.options;

    // Get or create composition
    var comp;
    if (options.createNewComp) {
      comp = getOrCreateComposition(options.compName);
    } else {
      if (!(app.project.activeItem instanceof CompItem)) {
        return 'Error: Active item is not a composition';
      }
      comp = app.project.activeItem;
    }

    if (!comp) {
      return 'Error: Could not create or get composition';
    }

    // Import scenes
    var currentTime = comp.time;
    var projectFPS = comp.frameDuration;

    app.beginUndoGroup("Import Scenes from PrismVid");

    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];
      var videoPath = scene.videoFilePath || scene.videoUrl;

      if (!videoPath) {
        continue;
      }

      try {
        // Import footage
        var footageItem = findExistingFootage(videoPath);
        
        if (!footageItem) {
          footageItem = importFootage(videoPath);
        }

        if (footageItem) {
          // Create layer
          var layer = comp.layers.add(footageItem);

          // Set timecode (ms to seconds)
          var startSec = scene.startTime / 1000;
          var endSec = scene.endTime / 1000;

          layer.inPoint = startSec;
          layer.outPoint = endSec;

          // Set position
          if (options.sequential) {
            layer.startTime = currentTime;

            var duration = endSec - startSec;
            var gapSec = (options.gapFrames || 0) * projectFPS;
            currentTime += duration + gapSec;
          }
        }
      } catch (e) {
        // Continue with next scene
        $.writeln('Error importing scene: ' + e.toString());
      }
    }

    app.endUndoGroup();
    return 'success';
  } catch (e) {
    if (app.isUndoGroupOpen) {
      app.endUndoGroup();
    }
    return 'Error: ' + e.toString();
  }
}

function getOrCreateComposition(name) {
  try {
    // Check if exists
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === name) {
        return item;
      }
    }

    // Create new (1920x1080, 25fps, 10s)
    var comp = app.project.items.addComp(name, 1920, 1080, 1, 25, 10);
    return comp;
  } catch (e) {
    return null;
  }
}

function importFootage(filePath) {
  try {
    var file = new File(filePath);
    
    if (!file.exists) {
      $.writeln('File not found: ' + filePath);
      return null;
    }

    var importOptions = new ImportOptions(file);
    var footageItem = app.project.importFile(importOptions);
    
    return footageItem;
  } catch (e) {
    $.writeln('Error importing footage: ' + e.toString());
    return null;
  }
}

function findExistingFootage(filePath) {
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FootageItem) {
      var mainSource = item.mainSource;
      if (mainSource instanceof FileSource) {
        try {
          if (mainSource.file && mainSource.file.fsName === filePath) {
            return item;
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }
  return null;
}

function getProjectInfo() {
  try {
    var info = {
      name: app.project.file ? app.project.file.name : "Untitled",
      numItems: app.project.numItems,
      activeComp: app.project.activeItem ? app.project.activeItem.name : null
    };
    
    // Convert to JSON string
    if (typeof JSON !== 'undefined' && JSON.stringify) {
      return JSON.stringify(info);
    } else {
      // Fallback
      return '{"name":"' + info.name + '","numItems":' + info.numItems + '}';
    }
  } catch (e) {
    return '{"error":"' + e.toString() + '"}';
  }
}

function testFunction() {
  try {
    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) {
      return "Active comp: " + comp.name;
    }
    return "No active composition";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

