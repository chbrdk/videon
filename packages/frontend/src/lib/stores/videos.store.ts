import { writable } from 'svelte/store';
import { videosApi, type Video, type VideoWithScenes } from '$lib/api/videos';

export const videos = writable<Video[]>([]);
export const selectedVideo = writable<VideoWithScenes | null>(null);
export const videoScenes = writable<any[]>([]);
export const uploadProgress = writable<number>(0);
export const uploading = writable<boolean>(false);
export const uploadError = writable<string | null>(null);
export const error = writable<string | null>(null);

export const loadVideos = async () => {
  try {
    const fetchedVideos = await videosApi.getAllVideos();
    videos.set(fetchedVideos);
    error.set(null);
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to load videos');
  }
};

export const uploadVideo = async (file: File, onProgress?: (progress: number) => void) => {
  error.set(null);
  uploadProgress.set(0);
  try {
    const response = await videosApi.uploadVideoChunked(file, (progress) => {
      uploadProgress.set(progress);
      if (onProgress) onProgress(progress);
    });
    // After successful upload, refresh the video list
    await loadVideos();
    uploadProgress.set(100);
    return response;
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to upload video');
    uploadProgress.set(0);
    throw err; // Re-throw to allow component to handle redirection
  }
};

export const loadVideoDetails = async (videoId: string) => {
  try {
    const videoDetails = await videosApi.getVideoById(videoId);
    selectedVideo.set(videoDetails);
    videoScenes.set(videoDetails.scenes || []);
    return videoDetails;
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to load video details');
    throw err; // Re-throw the error for component-level handling
  }
};

export const refreshVideo = async (videoId: string) => {
  try {
    const videoDetails = await videosApi.getVideoById(videoId);
    selectedVideo.set(videoDetails);
    videoScenes.set(videoDetails.scenes || []);
    error.set(null);
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Failed to refresh video');
  }
};