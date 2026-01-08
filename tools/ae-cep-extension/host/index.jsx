// PrismVid Scene Search - ExtendScript Bridge
// This file runs in After Effects context

/**
 * Import scenes from PrismVid search results into After Effects
 * @param {Object} data - { scenes: Array, options: Object }
 * @returns {string} - "success" or error message
 */
function importScenes(data) {
  try {
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

    // Import scenes
    var currentTime = 0;

    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];
      var videoPath = scene.videoFilePath;

      if (!videoPath) {
        continue;
      }

      try {
        // Import footage
        var footageItem = findExistingFootage(videoPath) || importFootage(videoPath);

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
            var gapSec = options.gapFrames / comp.frameDuration;
            currentTime += duration + gapSec;
          }
        }
      } catch (e) {
        // Continue with next scene
      }
    }

    return 'success';
  } catch (e) {
    return 'Error: ' + e.toString();
  }
}

function getOrCreateComposition(name) {
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
}

function importFootage(filePath) {
  try {
    var file = new File(filePath);
    
    if (!file.exists) {
      return null;
    }

    var importOptions = new ImportOptions(file);
    var footageItem = app.project.importFile(importOptions);
    
    return footageItem;
  } catch (e) {
    return null;
  }
}

function findExistingFootage(filePath) {
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FootageItem) {
      var mainSource = item.mainSource;
      if (mainSource instanceof FileSource && mainSource.file && mainSource.file.fsName === filePath) {
        return item;
      }
    }
  }
  return null;
}

