import fs from 'fs';
import path from 'path';
import { execAsync } from '../utils/file-helper';
import logger from '../utils/logger';

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface WaveformCacheEntry {
  data: WaveformData;
  timestamp: number;
  fileSize: number;
}

export class WaveformService {
  private cacheDir: string;
  private cache: Map<string, WaveformCacheEntry>;
  private maxCacheSize: number;
  
         constructor(cacheDir: string = (process.env.WAVEFORMS_STORAGE_PATH || process.env.STORAGE_PATH ? `${process.env.STORAGE_PATH}/waveforms` : '/app/storage/waveforms')) {
           this.cacheDir = cacheDir;
           this.cache = new Map();
           this.maxCacheSize = 20; // Reduced due to larger waveforms (10000 peaks each)
           
           // Erstelle Cache-Verzeichnis
           if (!fs.existsSync(this.cacheDir)) {
             fs.mkdirSync(this.cacheDir, { recursive: true });
           }
           
           // CLEAR ALL CACHE ON STARTUP (for debugging)
           logger.warn('🗑️ CLEARING WAVEFORM CACHE ON STARTUP');
           this.clearAllCache();
         }
  
  /**
   * Generiert Waveform-Daten für eine Audio-Datei
   */
  async generateWaveformData(
    audioPath: string, 
    startTime?: number, 
    endTime?: number,
    width: number = 10000
  ): Promise<WaveformData> {
    try {
      // Prüfe Cache zuerst
      const cacheKey = this.getCacheKey(audioPath, startTime, endTime, width);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        logger.info(`📊 Waveform cache hit for ${path.basename(audioPath)}`);
        return cached;
      }
      
      logger.info(`📊 Generating waveform for ${path.basename(audioPath)}`);
      
      // Prüfe ob Datei existiert
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }
      
      // Generiere Waveform mit FFmpeg
      const waveformData = await this.generateWaveformWithFFmpeg(
        audioPath, 
        startTime, 
        endTime, 
        width
      );
      
      // Speichere im Cache
      this.setCache(cacheKey, waveformData);
      
      logger.info(`✅ Waveform generated: ${waveformData.peaks.length} peaks`);
      return waveformData;
      
    } catch (error) {
      logger.error(`❌ Waveform generation failed for ${audioPath}:`, error);
      throw error;
    }
  }
  
  /**
   * Generiert Waveform mit FFmpeg - Extrahiert echte Audio-Peaks
   */
  private async generateWaveformWithFFmpeg(
    audioPath: string,
    startTime?: number,
    endTime?: number,
    width: number = 1000
  ): Promise<WaveformData> {
    
    const safeWidth = Math.max(width || 100, 100);
    const tempRawPath = `/tmp/waveform_${Date.now()}.raw`;
    
    try {
      // FFmpeg Command um Audio in s16le raw format zu konvertieren
      let cmd = [
        'ffmpeg',
        '-i', audioPath
      ];
      
      // Add timerange if specified
      if (startTime !== undefined) {
        cmd.push('-ss', startTime.toString());
      }
      if (endTime !== undefined && startTime !== undefined) {
        cmd.push('-t', (endTime - startTime).toString());
      } else if (endTime !== undefined) {
        cmd.push('-t', endTime.toString());
      }
      
      cmd.push(
        '-af', 'aresample=8000,volume=10dB', // Downsample to 8kHz and boost quiet audio
        '-f', 's16le', // Signed 16-bit little-endian
        '-ac', '1', // Mono
        '-y',
        tempRawPath
      );
      
      logger.info(`🎵 FFmpeg waveform extract command: ${cmd.join(' ')}`);
      
      const { stderr } = await execAsync(cmd.join(' '));
      
      if (stderr && stderr.includes('error')) {
        throw new Error(`FFmpeg error: ${stderr}`);
      }
      
      // Check if raw file exists and get size
      if (!fs.existsSync(tempRawPath)) {
        throw new Error(`Raw audio file not created: ${tempRawPath}`);
      }
      
      const rawData = fs.readFileSync(tempRawPath);
      logger.info(`🎵 Raw audio file size: ${rawData.length} bytes`);
      
      // Parse s16le samples and convert to peaks
      const samples = [];
      for (let i = 0; i < rawData.length; i += 2) {
        const sample = rawData.readInt16LE(i);
        const normalized = Math.abs(sample / 32768.0); // Normalize to 0-1
        samples.push(normalized);
      }
      
      logger.info(`🎵 Parsed ${samples.length} samples from raw audio`);
      
      // Log first 10 samples for debugging
      logger.info(`🎵 First 10 samples: ${samples.slice(0, 10).map(s => s.toFixed(6)).join(', ')}`);
      
      // Convert samples to peaks (for the specified width)
      const peaks = this.convertSamplesToPeaks(samples, safeWidth);
      
      // Get metadata
      const metadata = await this.getAudioMetadata(audioPath);
      
      // Cleanup temp file
      if (fs.existsSync(tempRawPath)) {
        fs.unlinkSync(tempRawPath);
      }
      
      logger.info(`✅ Waveform generated with ${peaks.length} peaks from ${samples.length} samples`);
      
      return {
        peaks,
        duration: metadata.duration,
        sampleRate: 8000, // Resampled
        channels: 1
      };
      
    } catch (error) {
      logger.error(`FFmpeg waveform generation failed: ${error}`);
      
      // Cleanup on error
      if (fs.existsSync(tempRawPath)) {
        fs.unlinkSync(tempRawPath);
      }
      
      // Fallback: Generiere einfache Peaks
      const metadata = await this.getAudioMetadata(audioPath);
      const peaks = this.generateSimplePeaks(safeWidth, metadata.duration);
      
      return {
        peaks,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels
      };
    }
  }
  
  /**
   * Konvertiert Audio-Samples zu Peaks für eine bestimmte Breite
   */
  private convertSamplesToPeaks(samples: number[], width: number): number[] {
    const peaks: number[] = [];
    const samplesPerPeak = Math.max(1, Math.floor(samples.length / width));
    
    // Check if we have valid samples (use efficient max/min for large arrays)
    let sampleMax = 0;
    let sampleMin = 1;
    for (const sample of samples) {
      if (sample > sampleMax) sampleMax = sample;
      if (sample < sampleMin) sampleMin = sample;
    }
    logger.info(`🎵 Sample range: min=${sampleMin}, max=${sampleMax}, count=${samples.length}`);
    
    if (sampleMax === 0 && sampleMin === 0) {
      logger.warn('🎵 All samples are 0 - audio may be silent or extraction failed');
    }
    
    for (let i = 0; i < width; i++) {
      let sum = 0;
      let maxPeak = 0;
      let count = 0;
      
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, samples.length);
      
      for (let j = start; j < end; j++) {
        sum += samples[j];
        maxPeak = Math.max(maxPeak, samples[j]);
        count++;
      }
      
      // Use average for smoother waveform, but weighted by max peak
      const avg = count > 0 ? sum / count : 0;
      
      // Apply aggressive normalization for quiet audio
      // This ensures even very quiet audio is visible
      const normalizedAvg = avg > 0 ? Math.max(0.01, avg * 3) : 0; // Boost quiet audio by 3x
      const normalizedMax = maxPeak > 0 ? Math.max(0.01, maxPeak * 3) : 0;
      
      const peak = (normalizedAvg * 0.7 + normalizedMax * 0.3); // Weighted average
      
      peaks.push(Math.min(1.0, peak));
    }
    
    logger.info(`🎵 Generated ${peaks.length} peaks, max=${Math.max(...peaks)}, min=${Math.min(...peaks)}`);
    
    return peaks;
  }
  
  /**
   * Baut FFmpeg Filter für Waveform-Generierung
   */
  private buildWaveformFilter(startTime?: number, endTime?: number, width: number = 1000): string {
    let filter = `[0:a]`;
    
    // Timerange-Filter
    if (startTime !== undefined || endTime !== undefined) {
      const ss = startTime || 0;
      const t = endTime ? endTime - ss : undefined;
      
      if (t !== undefined) {
        filter += `atrim=start=${ss}:duration=${t},`;
      } else {
        filter += `atrim=start=${ss},`;
      }
    }
    
    // Waveform-Filter - ensure width is at least 100
    const safeWidth = Math.max(width || 100, 100);
    filter += `showwavespic=s=${safeWidth}x200:colors=0x00ff00:scale=sqrt`;
    
    return filter;
  }
  
  /**
   * Generiert einfache Peaks für Fallback-Waveform
   */
  private generateSimplePeaks(width: number, duration: number): number[] {
    const peaks: number[] = [];
    
    for (let i = 0; i < width; i++) {
      // Generiere zufällige aber realistische Peaks
      const baseLevel = 0.1 + Math.random() * 0.3; // Basis-Level zwischen 0.1 und 0.4
      const variation = Math.sin(i * 0.1) * 0.2; // Sinus-Variation für natürlichere Wellenform
      const randomPeak = Math.random() * 0.4; // Zufällige Spitzen
      
      const peak = Math.min(1.0, Math.max(0.0, baseLevel + variation + randomPeak));
      peaks.push(peak);
    }
    
    return peaks;
  }
  
  /**
   * Parst Waveform-Buffer zu Peak-Array (nicht mehr verwendet)
   */
  private parseWaveformBuffer(buffer: Buffer, width: number): number[] {
    const peaks: number[] = [];
    const samplesPerPixel = Math.floor(buffer.length / 2 / width); // 2 bytes per s16le sample
    
    for (let i = 0; i < width; i++) {
      let maxPeak = 0;
      
      // Finde Maximum in diesem Pixel-Bereich
      for (let j = 0; j < samplesPerPixel; j++) {
        const offset = (i * samplesPerPixel + j) * 2;
        if (offset + 2 <= buffer.length) {
          const sample = buffer.readInt16LE(offset) / 32768.0; // Convert to normalized float (-1 to 1)
          maxPeak = Math.max(maxPeak, Math.abs(sample));
        }
      }
      
      peaks.push(maxPeak);
    }
    
    return peaks;
  }
  
  /**
   * Holt Audio-Metadaten mit FFprobe
   */
  private async getAudioMetadata(audioPath: string): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
  }> {
    const cmd = [
      'ffprobe',
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      audioPath
    ];
    
    try {
      const { stdout } = await execAsync(cmd.join(' '));
      const data = JSON.parse(stdout);
      
      const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(data.format.duration) || 0,
        sampleRate: parseInt(audioStream?.sample_rate) || 44100,
        channels: parseInt(audioStream?.channels) || 2
      };
      
    } catch (error) {
      logger.error(`Failed to get audio metadata: ${error}`);
      return {
        duration: 0,
        sampleRate: 44100,
        channels: 2
      };
    }
  }
  
  /**
   * Generiert Cache-Key
   */
  private getCacheKey(audioPath: string, startTime?: number, endTime?: number, width: number = 1000): string {
    const stats = fs.statSync(audioPath);
    const timerange = startTime !== undefined || endTime !== undefined 
      ? `_${startTime || 0}_${endTime || 'end'}` 
      : '';
    
    return `${path.basename(audioPath)}${timerange}_${width}_${stats.mtime.getTime()}`;
  }
  
  /**
   * Holt Daten aus Cache
   */
  private getFromCache(cacheKey: string): WaveformData | null {
    // Memory Cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    
    // File Cache
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.cache.set(cacheKey, data);
        return data.data;
      } catch (error) {
        logger.warn(`Failed to read cache file ${cacheFile}: ${error}`);
      }
    }
    
    return null;
  }
  
  /**
   * Speichert Daten im Cache
   */
  private setCache(cacheKey: string, data: WaveformData): void {
    const entry: WaveformCacheEntry = {
      data,
      timestamp: Date.now(),
      fileSize: 0
    };
    
    // Memory Cache
    this.cache.set(cacheKey, entry);
    
    // Cleanup Memory Cache wenn zu groß
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    // File Cache
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(entry, null, 2));
    } catch (error) {
      logger.warn(`Failed to write cache file ${cacheFile}: ${error}`);
    }
  }
  
  /**
   * Löscht Cache für eine Datei
   */
  clearCacheForFile(audioPath: string): void {
    const baseName = path.basename(audioPath);
    
    // Memory Cache löschen
    for (const key of this.cache.keys()) {
      if (key.startsWith(baseName)) {
        this.cache.delete(key);
      }
    }
    
    // File Cache löschen
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.startsWith(baseName)) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      logger.warn(`Failed to clear file cache for ${audioPath}: ${error}`);
    }
  }
  
  /**
   * Löscht gesamten Cache
   */
  clearAllCache(): void {
    this.cache.clear();
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    } catch (error) {
      logger.warn(`Failed to clear all cache: ${error}`);
    }
  }
  
  /**
   * Holt Cache-Statistiken
   */
  getCacheStats(): {
    memoryCacheSize: number;
    fileCacheSize: number;
    totalCacheSize: number;
  } {
    let fileCacheSize = 0;
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const stats = fs.statSync(path.join(this.cacheDir, file));
        fileCacheSize += stats.size;
      }
    } catch (error) {
      logger.warn(`Failed to get file cache size: ${error}`);
    }
    
    return {
      memoryCacheSize: this.cache.size,
      fileCacheSize,
      totalCacheSize: this.cache.size + fileCacheSize
    };
  }
}
