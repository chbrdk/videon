import { test, expect } from '@playwright/test';

test.describe('Video Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display upload component', async ({ page }) => {
    await expect(page.getByText('Video hochladen')).toBeVisible();
    await expect(page.getByText('Datei hier ablegen oder klicken zum Auswählen')).toBeVisible();
    await expect(page.getByRole('button', { name: /video hochladen/i })).toBeVisible();
  });

  test('should open file dialog when button is clicked', async ({ page }) => {
    const button = page.getByRole('button', { name: /video hochladen/i });
    
    // Set up file dialog handler
    page.on('filechooser', async (fileChooser) => {
      await fileChooser.setFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake video content')
      });
    });

    await button.click();
    
    // File dialog should open (we can't test the actual dialog, but we can test the input)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should show drag and drop zone', async ({ page }) => {
    const dropZone = page.locator('[data-testid="upload-zone"]');
    await expect(dropZone).toBeVisible();
    
    // Test drag over effect
    await dropZone.hover();
    // Should have some visual feedback (we can't easily test CSS changes, but we can test the element exists)
  });

  test('should validate file type', async ({ page }) => {
    // Mock a non-video file upload
    const button = page.getByRole('button', { name: /video hochladen/i });
    
    page.on('filechooser', async (fileChooser) => {
      await fileChooser.setFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('fake text content')
      });
    });

    await button.click();
    
    // Should show error message
    await expect(page.getByText(/nur video-dateien/i)).toBeVisible();
  });

  test('should show progress during upload', async ({ page }) => {
    // Mock successful upload
    await page.route('**/api/videos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-video-id',
          filename: 'test-video.mp4',
          status: 'UPLOADED'
        })
      });
    });

    const button = page.getByRole('button', { name: /video hochladen/i });
    
    page.on('filechooser', async (fileChooser) => {
      await fileChooser.setFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake video content')
      });
    });

    await button.click();
    
    // Should show progress indicator
    await expect(page.getByRole('progressbar')).toBeVisible();
  });

  test('should handle upload error', async ({ page }) => {
    // Mock upload error
    await page.route('**/api/videos', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Upload failed'
        })
      });
    });

    const button = page.getByRole('button', { name: /video hochladen/i });
    
    page.on('filechooser', async (fileChooser) => {
      await fileChooser.setFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake video content')
      });
    });

    await button.click();
    
    // Should show error message
    await expect(page.getByText(/upload fehlgeschlagen/i)).toBeVisible();
  });
});
