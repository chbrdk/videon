/*
 * PrismVid Scene Search for After Effects
 * 
 * Usage:
 * - Run this script in After Effects (File > Scripts > Run Script File...)
 * - Search for scenes using PrismVid backend
 * - Add selected scenes directly to your composition
 */

(function() {
    // ==============================================================================
    // Configuration
    // ==============================================================================
    
    var BACKEND_URL = "http://localhost:8080";  // Proxy Server
    var USE_PROXY = true;  // Set to true to use proxy
    
    // ==============================================================================
    // Main Application
    // ==============================================================================
    
    function PrismVidSearchApp() {
        this.mainWindow = null;
        this.searchResults = [];
        this.selectedIndices = [];
        
        this.createUI();
    }
    
    PrismVidSearchApp.prototype = {
        
        createUI: function() {
            var win = new Window("dialog", "PrismVid Scene Search");
            win.orientation = "column";
            win.alignChildren = "fill";
            win.spacing = 10;
            win.margins = 20;
            
            // Server Settings Group
            var settingsGroup = win.add("panel", undefined, "Server Settings");
            settingsGroup.orientation = "column";
            settingsGroup.alignChildren = "fill";
            settingsGroup.spacing = 5;
            settingsGroup.margins = 15;
            
            var urlGroup = settingsGroup.add("group");
            urlGroup.add("statictext", undefined, "Server URL:");
            urlGroup.children[0].preferredSize.width = 80;
            
            var urlField = urlGroup.add("edittext", undefined, BACKEND_URL);
            urlField.preferredSize.width = 250;
            
            // Connection Test Button
            var appInstance = this;
            var testBtn = settingsGroup.add("button", undefined, "Test Connection");
            testBtn.onClick = function() {
                appInstance.testConnection(urlField.text);
            };
            
            // Search Group
            var searchGroup = win.add("panel", undefined, "Search");
            searchGroup.orientation = "column";
            searchGroup.alignChildren = "fill";
            searchGroup.spacing = 5;
            searchGroup.margins = 15;
            
            var inputGroup = searchGroup.add("group");
            inputGroup.add("statictext", undefined, "Query:");
            inputGroup.children[0].preferredSize.width = 80;
            
            var queryField = inputGroup.add("edittext", undefined, "");
            queryField.preferredSize.width = 200;
            queryField.onChanging = function() {
                // Trigger search on enter or timeout
            };
            
            var searchBtn = inputGroup.add("button", undefined, "Search");
            searchBtn.onClick = function() {
                if (queryField.text.length > 0) {
                    appInstance.performSearch(queryField.text, urlField.text);
                }
            };
            
            // Results Group
            var resultsGroup = win.add("panel", undefined, "Results");
            resultsGroup.orientation = "column";
            resultsGroup.alignChildren = "fill";
            resultsGroup.spacing = 5;
            resultsGroup.margins = 15;
            
            var resultsList = resultsGroup.add("treeview", undefined, undefined);
            resultsList.preferredSize.height = 200;
            resultsList.preferredSize.width = 400;
            
            var selectAllBtn = resultsGroup.add("button", undefined, "Select All");
            selectAllBtn.onClick = function() {
                for (var i = 0; i < resultsList.items.length; i++) {
                    resultsList.items[i].checked = true;
                }
            };
            
            // Insert Options
            var insertGroup = win.add("panel", undefined, "Insert Options");
            insertGroup.orientation = "column";
            insertGroup.alignChildren = "fill";
            insertGroup.spacing = 5;
            insertGroup.margins = 15;
            
            var compOptions = insertGroup.add("group");
            compOptions.add("statictext", undefined, "Target Comp:");
            
            var compDropdown = compOptions.add("dropdownlist", undefined, ["New Composition", "Active Composition"]);
            compDropdown.selection = 0;
            
            var newCompNameGroup = insertGroup.add("group");
            newCompNameGroup.add("statictext", undefined, "Name:");
            newCompNameGroup.children[0].preferredSize.width = 80;
            
            var newCompName = newCompNameGroup.add("edittext", undefined, "Search Results");
            newCompName.preferredSize.width = 200;
            newCompName.enabled = compDropdown.selection.index === 0;
            
            compDropdown.onChange = function() {
                newCompName.enabled = (compDropdown.selection.index === 0);
            };
            
            var sequentialGroup = insertGroup.add("group");
            var sequentialCheck = sequentialGroup.add("checkbox", undefined, "Sequential Placement");
            sequentialCheck.value = true;
            
            var gapGroup = insertGroup.add("group");
            gapGroup.add("statictext", undefined, "Gap (frames):");
            var gapField = gapGroup.add("edittext", undefined, "0");
            gapField.preferredSize.width = 50;
            gapField.enabled = sequentialCheck.value;
            
            sequentialCheck.onClick = function() {
                gapField.enabled = sequentialCheck.value;
            };
            
            // Buttons
            var buttonGroup = win.add("group");
            buttonGroup.alignChildren = "right";
            
            var insertBtn = buttonGroup.add("button", undefined, "Add Scenes to AE");
            insertBtn.enabled = false;
            insertBtn.onClick = function() {
                appInstance.insertSelectedScenes(
                    compDropdown.selection.index === 0,
                    newCompName.text,
                    sequentialCheck.value,
                    parseInt(gapField.text) || 0,
                    resultsList,
                    urlField.text
                );
            };
            
            var cancelBtn = buttonGroup.add("button", undefined, "Close");
            cancelBtn.onClick = function() {
                win.close();
            };
            
            // Store references
            this.win = win;
            this.urlField = urlField;
            this.queryField = queryField;
            this.resultsList = resultsList;
            this.insertBtn = insertBtn;
            this.backendUrl = urlField;
            
            // Show window
            win.center();
            win.show();
        },
        
        testConnection: function(url) {
            try {
                var testUrl;
                if (USE_PROXY) {
                    testUrl = "http://localhost:8080/health";
                } else {
                    testUrl = url + "/api/health";
                }
                
                var result = this.httpGet(testUrl);
                
                if (result !== null) {
                    alert("Connection successful!");
                } else {
                    var errorMsg = "Connection failed. Please check:\n\n";
                    if (USE_PROXY) {
                        errorMsg += "1. Proxy server is running (tools/ae-proxy-server/server.js)\n";
                        errorMsg += "2. Backend is running (docker ps)\n";
                    } else {
                        errorMsg += "1. Backend is running (docker ps)\n";
                        errorMsg += "2. URL is correct: " + url + "\n";
                        errorMsg += "3. No firewall blocking\n";
                    }
                    errorMsg += "\nSee docs/AE_SCRIPT_USAGE.md for details";
                    alert(errorMsg);
                }
            } catch (e) {
                alert("Connection error: " + e.toString());
            }
        },
        
        performSearch: function(query, backendUrl) {
            try {
                var insertBtn = this.insertBtn;
                insertBtn.enabled = false;
                
                var resultsList = this.resultsList;
                resultsList.removeAll();
                
                var searchUrl;
                if (USE_PROXY) {
                    searchUrl = "http://localhost:8080/proxy/search?q=" + encodeURI(query);
                } else {
                    searchUrl = backendUrl + "/api/search?q=" + encodeURI(query) + "&limit=20";
                }
                
                var response = this.httpGet(searchUrl);
                
                if (response === null) {
                    alert("Search failed. Please check backend connection.");
                    return;
                }
                
                // Parse JSON response
                var results = this.parseJSON(response);
                
                if (!results || results.length === 0) {
                    alert("No results found for: " + query);
                    return;
                }
                
                this.searchResults = results;
                this.selectedIndices = [];
                
                // Populate results list
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var startTime = this.formatTime(result.startTime);
                    var endTime = this.formatTime(result.endTime);
                    var duration = ((result.endTime - result.startTime) / 1000).toFixed(1) + "s";
                    
                    var item = resultsList.add("node", 
                        result.videoTitle + " [" + startTime + " - " + endTime + "] (" + duration + ")");
                    item.nodeLabel = result.content.substring(0, 50) + "...";
                    
                    // Store index
                    item.index = i;
                    item.checked = false;
                }
                
                insertBtn.enabled = true;
                
            } catch (e) {
                alert("Search error: " + e.toString());
            }
        },
        
        insertSelectedScenes: function(createNewComp, compName, sequential, gapFrames, resultsList, backendUrl) {
            try {
                // Check if project is open
                if (!app.project.activeItem) {
                    alert("Please create or open a project first!");
                    return;
                }
                
                // Get selected items
                var selectedScenes = [];
                for (var i = 0; i < resultsList.items.length; i++) {
                    if (resultsList.items[i].checked) {
                        selectedScenes.push(i);
                    }
                }
                
                if (selectedScenes.length === 0) {
                    alert("Please select at least one scene.");
                    return;
                }
                
                // Get or create composition
                var comp;
                if (createNewComp) {
                    comp = this.createOrGetComposition(compName);
                } else {
                    if (!(app.project.activeItem instanceof CompItem)) {
                        alert("Active item is not a composition.");
                        return;
                    }
                    comp = app.project.activeItem;
                }
                
                // Progress
                var progressWin = new Window("dialog", "Adding Scenes");
                progressWin.add("statictext", undefined, "Processing " + selectedScenes.length + " scenes...");
                progressWin.show();
                
                // Insert each scene
                var currentTime = 0;
                
                for (var j = 0; j < selectedScenes.length; j++) {
                    var sceneIndex = selectedScenes[j];
                    var scene = this.searchResults[sceneIndex];
                    
                    try {
                        var importResult = this.importVideoScene(
                            scene,
                            comp,
                            currentTime,
                            backendUrl
                        );
                        
                        if (sequential) {
                            var duration = (scene.endTime - scene.startTime) / 1000;
                            var gapDuration = gapFrames / comp.frameDuration;
                            currentTime += duration + gapDuration;
                        }
                        
                    } catch (e) {
                        alert("Error adding scene: " + scene.videoTitle + "\n" + e.toString());
                    }
                }
                
                progressWin.close();
                alert("Successfully added " + selectedScenes.length + " scene(s)!");
                this.win.close();
                
            } catch (e) {
                alert("Insert error: " + e.toString());
            }
        },
        
        createOrGetComposition: function(name) {
            // Check if composition already exists
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.name === name) {
                    return item;
                }
            }
            
            // Create new composition (1920x1080, 25fps, 10 seconds)
            var comp = app.project.items.addComp(name, 1920, 1080, 1, 25, 10);
            return comp;
        },
        
        importVideoScene: function(scene, comp, startTimeInComp, backendUrl) {
            // Get video file path
            var videoPath = scene.videoFilePath;
            
            if (!videoPath) {
                throw new Error("No video path available for scene");
            }
            
            // Check if file exists
            var videoFile = new File(videoPath);
            if (!videoFile.exists) {
                throw new Error("Video file not found: " + videoPath);
            }
            
            // Check if footage already imported
            var existingFootage = this.findExistingFootage(videoPath);
            var footageItem;
            
            if (existingFootage) {
                footageItem = existingFootage;
            } else {
                // Import footage
                var importOptions = new ImportOptions(new File(videoPath));
                footageItem = app.project.importFile(importOptions);
            }
            
            if (!footageItem) {
                throw new Error("Failed to import footage");
            }
            
            // Add to composition
            var layer = comp.layers.add(footageItem);
            
            // Set time (convert milliseconds to seconds)
            var startSec = scene.startTime / 1000;
            var endSec = scene.endTime / 1000;
            
            // Set layer in/out points
            layer.inPoint = startSec;
            layer.outPoint = endSec;
            
            // Set layer start time in composition
            if (startTimeInComp > 0) {
                layer.startTime = startTimeInComp;
            }
            
            return layer;
        },
        
        findExistingFootage: function(filePath) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof FootageItem) {
                    if (item.mainSource instanceof FileSource) {
                        if (item.mainSource.file.fsName === filePath) {
                            return item;
                        }
                    }
                }
            }
            return null;
        },
        
        // Utility: HTTP GET request via shell command
        httpGet: function(url) {
            try {
                // Note: ExtendScript has severe limitations with HTTP requests
                // Using curl via system() with proper error handling
                var curlCommand = 'curl -s "' + url + '"';
                var tempFolder = Folder.temp;
                var tempFilePath = tempFolder.fsName + "/prismvid_response.json";
                var outputFile = new File(tempFilePath);
                
                // Execute system command (requires AE Preferences > Allow Scripts)
                var result = app.system(curlCommand, outputFile);
                
                // Read the output file if it exists
                if (outputFile.exists) {
                    outputFile.open('r');
                    var content = outputFile.read();
                    outputFile.close();
                    outputFile.remove();
                    return content;
                }
                
                return null;
                
            } catch (e) {
                var errorMsg = "HTTP Request Error: " + String(e);
                alert(errorMsg + "\n\nRequirements:\n1. curl installed\n2. Preferences > Allow Scripts\n3. Proxy running on localhost:8080");
                return null;
            }
        },
        
        // Utility: Format time in HH:MM:SS
        formatTime: function(ms) {
            var totalSeconds = Math.floor(ms / 1000);
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;
            
            if (hours > 0) {
                return hours + ":" + 
                       minutes.toString().padStart(2, '0') + ":" + 
                       seconds.toString().padStart(2, '0');
            }
            return minutes + ":" + seconds.toString().padStart(2, '0');
        },
        
        // Simple JSON parser (basic implementation)
        parseJSON: function(jsonString) {
            try {
                // Use eval for JSON parsing (for ExtendScript)
                return eval('(' + jsonString + ')');
            } catch (e) {
                return null;
            }
        }
    };
    
    // ==============================================================================
    // Initialize Application
    // ==============================================================================
    
    // Check if After Effects is running
    try {
        if (typeof(app) !== 'undefined') {
            var searchApp = new PrismVidSearchApp();
        } else {
            alert("This script must be run from within After Effects.\n\nPlease:\n1. Open After Effects\n2. File > Scripts > Run Script File...\n3. Select this file");
        }
    } catch (e) {
        alert("Error: " + e.toString() + "\n\nMake sure After Effects is running.");
    }
    
})();

