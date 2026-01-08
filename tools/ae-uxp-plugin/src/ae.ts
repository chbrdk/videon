// After Effects Integration via UXP Scripting API

import { SearchResult } from './api';
import { millisecondsToSeconds } from './utils';

export interface InsertOptions {
  targetComp: string;
  sequential: boolean;
  gapFrames: number;
}

export interface ProgressCallback {
  (current: number, total: number, status: string): void;
}

export class AEIntegration {
  async getCompositions(): Promise<Array<{ name: string; id: string }>> {
    try {
      const project = await this.getProject();
      
      const compositions: Array<{ name: string; id: string }> = [];
      for (let i = 1; i <= project.numItems; i++) {
        const item = project.item(i);
        if (item instanceof CompItem) {
          compositions.push({
            name: item.name,
            id: item.itemID.toString(),
          });
        }
      }
      
      return compositions;
    } catch (error) {
      console.error('Error getting compositions:', error);
      throw new Error('Failed to get compositions');
    }
  }

  async createComposition(name: string, width: number = 1920, height: number = 1080, fps: number = 25): Promise<CompItem> {
    try {
      const project = await this.getProject();
      const comp = project.items.addComp(name, width, height, 1, fps, 10);
      return comp;
    } catch (error) {
      console.error('Error creating composition:', error);
      throw new Error(`Failed to create composition: ${error}`);
    }
  }

  async getOrCreateComposition(name: string): Promise<CompItem> {
    const compositions = await this.getCompositions();
    const existingComp = compositions.find(c => c.name === name);
    
    if (existingComp) {
      return await this.findCompByName(name);
    }
    
    return await this.createComposition(name);
  }

  private async findCompByName(name: string): Promise<CompItem> {
    const project = await this.getProject();
    for (let i = 1; i <= project.numItems; i++) {
      const item = project.item(i);
      if (item instanceof CompItem && item.name === name) {
        return item;
      }
    }
    throw new Error(`Composition "${name}" not found`);
  }

  async importFootage(sourcePath: string): Promise<FootageItem | null> {
    try {
      const project = await this.getProject();
      const file = new File(sourcePath);
      
      if (!file.exists) {
        console.error(`File does not exist: ${sourcePath}`);
        return null;
      }

      // Check if footage already imported
      const existingFootage = this.findExistingFootage(sourcePath);
      if (existingFootage) {
        console.log(`Reusing existing footage: ${sourcePath}`);
        return existingFootage;
      }

      const footageItem = project.importFile(
        new ImportOptions(file)
      );
      
      return footageItem;
    } catch (error) {
      console.error('Error importing footage:', error);
      throw new Error(`Failed to import footage: ${error}`);
    }
  }

  private findExistingFootage(path: string): FootageItem | null {
    const project = this.getProject();
    for (let i = 1; i <= project.numItems; i++) {
      const item = project.item(i);
      if (item instanceof FootageItem) {
        const mainSource = item.mainSource;
        if (mainSource instanceof FileSource && mainSource.file?.fullName === path) {
          return item;
        }
      }
    }
    return null;
  }

  private getProject(): Project {
    const project = app.project;
    if (!project) {
      throw new Error('No project is open in After Effects');
    }
    return project;
  }

  async insertScene(
    comp: CompItem,
    result: SearchResult,
    startTimeInComp: number,
    fps: number = 25,
    onProgress?: ProgressCallback
  ): Promise<void> {
    try {
      onProgress?.(0, 100, 'Importing footage...');

      // Get video file path - this would need to be determined from your backend
      const videoPath = await this.getVideoFilePath(result);

      if (!videoPath) {
        throw new Error(`Cannot find video file for ${result.videoId}`);
      }

      const footageItem = await this.importFootage(videoPath);

      if (!footageItem) {
        throw new Error(`Failed to import footage: ${videoPath}`);
      }

      onProgress?.(50, 100, 'Adding layer to composition...');

      // Create layer from footage
      const layer = comp.layers.add(footageItem);
      
      // Calculate time range in seconds
      const startTimeSec = millisecondsToSeconds(result.startTime);
      const endTimeSec = millisecondsToSeconds(result.endTime);
      const durationSec = endTimeSec - startTimeSec;

      // Set layer in point (time in comp where layer starts)
      layer.inPoint = startTimeSec;
      layer.outPoint = endTimeSec;

      // Set layer start time in composition
      layer.startTime = startTimeInComp;

      // Set time remapping if needed
      // layer.enableTimeRemapping = true;

      onProgress?.(100, 100, 'Scene added successfully');
    } catch (error) {
      console.error('Error inserting scene:', error);
      throw new Error(`Failed to insert scene: ${error}`);
    }
  }

  async insertScenes(
    results: SearchResult[],
    options: InsertOptions,
    onProgress?: ProgressCallback
  ): Promise<void> {
    try {
      // Get or create target composition
      const comp = await this.getOrCreateComposition(options.targetComp);

      onProgress?.(0, results.length, 'Starting...');

      let currentTime = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        onProgress?.(i + 1, results.length, `Adding scene ${i + 1}/${results.length}...`);

        await this.insertScene(comp, result, currentTime);

        if (options.sequential) {
          const duration = millisecondsToSeconds(result.endTime - result.startTime);
          const gapDuration = options.gapFrames / comp.frameRate; // Convert frames to seconds
          currentTime += duration + gapDuration;
        }
      }

      onProgress?.(results.length, results.length, 'Complete');
    } catch (error) {
      console.error('Error inserting scenes:', error);
      throw error;
    }
  }

  private async getVideoFilePath(result: SearchResult): Promise<string | null> {
    // Backend now provides videoFilePath in search results
    if (result.videoFilePath) {
      return result.videoFilePath;
    }
    
    console.error('No video file path available for result:', result);
    return null;
  }
}

