/**
 * Extract video duration from a File object
 * This works client-side by creating a temporary video element
 */
export async function getVideoDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      resolve(duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate total course duration from chapters and lessons
 */
export function calculateCourseDuration(chapters: any[]): number {
  let totalSeconds = 0;
  
  for (const chapter of chapters) {
    if (chapter.baiHocs && Array.isArray(chapter.baiHocs)) {
      for (const lesson of chapter.baiHocs) {
        if (lesson.thoiLuong && typeof lesson.thoiLuong === 'number') {
          totalSeconds += lesson.thoiLuong;
        }
      }
    }
  }
  
  return totalSeconds;
}

/**
 * Format seconds to human-readable duration (for server-side use)
 */
export function formatSecondsToReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
