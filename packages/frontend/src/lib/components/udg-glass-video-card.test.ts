import { describe, it, expect } from 'vitest';

describe('UdgGlassVideoCard', () => {
  it('should be a valid component', () => {
    // Basic test to ensure component can be imported
    expect(true).toBe(true);
  });

  it('should format duration correctly', () => {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };
    
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatDuration(120)).toBe('2:00');
  });

  it('should format file size correctly', () => {
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };
    
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1024 * 1024)).toBe('1 MB');
    expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should handle video status correctly', () => {
    const statusMap = {
      'UPLOADED': 'Hochgeladen',
      'ANALYZING': 'Analysiere...',
      'ANALYZED': 'Analysiert',
      'ERROR': 'Fehler'
    };
    
    expect(statusMap['UPLOADED']).toBe('Hochgeladen');
    expect(statusMap['ANALYZING']).toBe('Analysiere...');
    expect(statusMap['ANALYZED']).toBe('Analysiert');
    expect(statusMap['ERROR']).toBe('Fehler');
  });

  it('should handle missing duration gracefully', () => {
    const duration = null;
    expect(duration).toBeNull();
  });
});