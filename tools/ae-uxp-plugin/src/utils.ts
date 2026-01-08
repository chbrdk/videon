// Utility functions

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(startMs: number, endMs: number): string {
  const duration = endMs - startMs;
  const seconds = Math.floor(duration / 1000);
  return `${seconds}s`;
}

export function millisecondsToSeconds(ms: number): number {
  return ms / 1000;
}

export function getVideoUrl(videoId: string, serverUrl: string): string {
  // Construct video file path - adjust based on your storage structure
  return `${serverUrl}/api/videos/${videoId}/file`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

