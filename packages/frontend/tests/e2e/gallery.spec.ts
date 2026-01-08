import { test, expect } from '@playwright/test';

test.describe('Video Gallery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock videos API
    await page.route('**/api/videos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'video-1',
            filename: 'test-video-1.mp4',
            originalName: 'Test Video 1',
            fileSize: 1024 * 1024,
            duration: 120,
            status: 'ANALYZED',
            uploadedAt: '2024-01-01T10:00:00Z',
            analyzedAt: '2024-01-01T10:05:00Z'
          },
          {
            id: 'video-2',
            filename: 'test-video-2.mp4',
            originalName: 'Test Video 2',
            fileSize: 2 * 1024 * 1024,
            duration: 180,
            status: 'UPLOADED',
            uploadedAt: '2024-01-01T11:00:00Z',
            analyzedAt: null
          }
        ])
      });
    });

    await page.goto('/');
  });

  test('should display video gallery', async ({ page }) => {
    await expect(page.getByText('Test Video 1')).toBeVisible();
    await expect(page.getByText('Test Video 2')).toBeVisible();
  });

  test('should show video cards with correct information', async ({ page }) => {
    // Check first video card
    await expect(page.getByText('Test Video 1')).toBeVisible();
    await expect(page.getByText('2:00')).toBeVisible(); // Duration
    await expect(page.getByText('1.0 MB')).toBeVisible(); // File size
    await expect(page.getByText('Analysiert')).toBeVisible(); // Status

    // Check second video card
    await expect(page.getByText('Test Video 2')).toBeVisible();
    await expect(page.getByText('3:00')).toBeVisible(); // Duration
    await expect(page.getByText('2.0 MB')).toBeVisible(); // File size
    await expect(page.getByText('Hochgeladen')).toBeVisible(); // Status
  });

  test('should navigate to video detail page when card is clicked', async ({ page }) => {
    // Mock video detail API
    await page.route('**/api/videos/video-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'video-1',
          filename: 'test-video-1.mp4',
          originalName: 'Test Video 1',
          fileSize: 1024 * 1024,
          duration: 120,
          status: 'ANALYZED',
          uploadedAt: '2024-01-01T10:00:00Z',
          analyzedAt: '2024-01-01T10:05:00Z',
          scenes: []
        })
      });
    });

    // Click on first video card
    await page.getByText('Test Video 1').click();
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/\/videos\/video-1/);
  });

  test('should show loading state while fetching videos', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/videos', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/');
    
    // Should show loading indicator
    await expect(page.getByText(/lade videos/i)).toBeVisible();
  });

  test('should show error state when API fails', async ({ page }) => {
    // Mock API error
    await page.route('**/api/videos', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error'
        })
      });
    });

    await page.goto('/');
    
    // Should show error message
    await expect(page.getByText(/fehler beim laden der videos/i)).toBeVisible();
  });

  test('should show empty state when no videos exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/videos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/');
    
    // Should show empty state
    await expect(page.getByText(/keine videos vorhanden/i)).toBeVisible();
  });

  test('should display videos in grid layout', async ({ page }) => {
    // Check that video cards are displayed in a grid
    const videoCards = page.locator('[data-testid="video-card"]');
    await expect(videoCards).toHaveCount(2);
    
    // Cards should be visible
    await expect(videoCards.first()).toBeVisible();
    await expect(videoCards.last()).toBeVisible();
  });

  test('should handle different video statuses correctly', async ({ page }) => {
    // Check analyzed video
    await expect(page.getByText('Analysiert')).toBeVisible();
    
    // Check uploaded video
    await expect(page.getByText('Hochgeladen')).toBeVisible();
  });
});
