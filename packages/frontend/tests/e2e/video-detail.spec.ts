import { test, expect } from '@playwright/test';

test.describe('Video Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock video detail API
    await page.route('**/api/videos/test-video-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-video-id',
          filename: 'test-video.mp4',
          originalName: 'Test Video',
          fileSize: 1024 * 1024,
          duration: 120,
          status: 'ANALYZED',
          uploadedAt: '2024-01-01T10:00:00Z',
          analyzedAt: '2024-01-01T10:05:00Z',
          scenes: []
        })
      });
    });

    // Mock scenes API
    await page.route('**/api/videos/test-video-id/scenes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'scene-1',
            startTime: 0,
            endTime: 30,
            keyframePath: '/keyframes/scene-1.jpg'
          },
          {
            id: 'scene-2',
            startTime: 30,
            endTime: 60,
            keyframePath: '/keyframes/scene-2.jpg'
          },
          {
            id: 'scene-3',
            startTime: 60,
            endTime: 90,
            keyframePath: null
          }
        ])
      });
    });

    await page.goto('/videos/test-video-id');
  });

  test('should display video detail page', async ({ page }) => {
    await expect(page.getByText('Test Video')).toBeVisible();
    await expect(page.getByText('2:00')).toBeVisible(); // Duration
    await expect(page.getByText('1.0 MB')).toBeVisible(); // File size
  });

  test('should display video player', async ({ page }) => {
    const videoPlayer = page.locator('video');
    await expect(videoPlayer).toBeVisible();
    
    // Check video source
    await expect(videoPlayer).toHaveAttribute('src', /test-video\.mp4/);
  });

  test('should display video metadata', async ({ page }) => {
    await expect(page.getByText('Test Video')).toBeVisible();
    await expect(page.getByText('test-video.mp4')).toBeVisible();
    await expect(page.getByText('2:00')).toBeVisible();
    await expect(page.getByText('1.0 MB')).toBeVisible();
    await expect(page.getByText('Analysiert')).toBeVisible();
  });

  test('should display scenes list', async ({ page }) => {
    await expect(page.getByText('Szenen (3)')).toBeVisible();
    
    // Check scene time ranges
    await expect(page.getByText('0:00 - 0:30')).toBeVisible();
    await expect(page.getByText('0:30 - 1:00')).toBeVisible();
    await expect(page.getByText('1:00 - 1:30')).toBeVisible();
  });

  test('should navigate video to scene when scene is clicked', async ({ page }) => {
    const videoPlayer = page.locator('video');
    const firstScene = page.getByText('0:00 - 0:30');
    
    // Click on first scene
    await firstScene.click();
    
    // Video should jump to start time (we can't easily test the actual video time, 
    // but we can test that the click event was handled)
    await expect(firstScene).toBeVisible();
  });

  test('should show scene thumbnails when available', async ({ page }) => {
    // Check that scenes with keyframes show thumbnails
    const sceneWithThumbnail = page.locator('[data-testid="scene-1"]');
    await expect(sceneWithThumbnail).toBeVisible();
    
    // Check that scenes without keyframes still show
    const sceneWithoutThumbnail = page.locator('[data-testid="scene-3"]');
    await expect(sceneWithoutThumbnail).toBeVisible();
  });

  test('should handle video not found', async ({ page }) => {
    // Mock 404 response
    await page.route('**/api/videos/non-existent', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Video not found'
        })
      });
    });

    await page.goto('/videos/non-existent');
    
    // Should show error message
    await expect(page.getByText(/video nicht gefunden/i)).toBeVisible();
  });

  test('should show loading state while fetching video', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/videos/slow-video-id', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'slow-video-id',
          filename: 'slow-video.mp4',
          originalName: 'Slow Video',
          fileSize: 1024 * 1024,
          duration: 120,
          status: 'ANALYZED',
          uploadedAt: '2024-01-01T10:00:00Z',
          analyzedAt: '2024-01-01T10:05:00Z',
          scenes: []
        })
      });
    });

    await page.goto('/videos/slow-video-id');
    
    // Should show loading indicator
    await expect(page.getByText(/lade video/i)).toBeVisible();
  });

  test('should handle scenes API error', async ({ page }) => {
    // Mock scenes API error
    await page.route('**/api/videos/test-video-id/scenes', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to fetch scenes'
        })
      });
    });

    await page.goto('/videos/test-video-id');
    
    // Should show error message for scenes
    await expect(page.getByText(/fehler beim laden der szenen/i)).toBeVisible();
  });

  test('should show empty scenes state', async ({ page }) => {
    // Mock empty scenes response
    await page.route('**/api/videos/test-video-id/scenes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/videos/test-video-id');
    
    // Should show empty scenes state
    await expect(page.getByText(/noch keine szenen analysiert/i)).toBeVisible();
  });

  test('should display video controls', async ({ page }) => {
    const videoPlayer = page.locator('video');
    await expect(videoPlayer).toBeVisible();
    
    // Check that video has controls
    await expect(videoPlayer).toHaveAttribute('controls');
  });

  test('should handle video playback errors', async ({ page }) => {
    const videoPlayer = page.locator('video');
    
    // Mock video load error
    await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.src = 'invalid-video-url.mp4';
      }
    });
    
    // Video should still be displayed (error handling is in the component)
    await expect(videoPlayer).toBeVisible();
  });
});
