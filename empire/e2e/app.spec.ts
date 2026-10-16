import { expect, test, type Page } from '@playwright/test';

/** Renders a JPEG in the page so tests need no binary fixtures. */
async function makeJpeg(page: Page, color: string) {
  const dataUrl = await page.evaluate((c) => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 1200, height: 900 });
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1200, 900);
    ctx.fillStyle = '#fff';
    ctx.fillRect(400, 300, 400, 300);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, color);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('full job site workflow on a phone', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');

  // Empty state → new project with device location
  await expect(page.getByRole('heading', { name: 'Start your first project' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: 'test-results/screens/1-empty.png' });
  await page.getByRole('link', { name: 'Create project' }).click();
  await page.getByLabel('Project name').fill('Smith Roof Replacement');
  await page.getByLabel('Address').fill('123 Main St, Austin TX');
  await page.getByLabel('Client').fill('Jane Smith');
  await page.getByRole('button', { name: /Use my location/ }).click();
  await expect(page.getByTestId('coords')).toHaveText('30.26720, -97.74310');
  await page.getByRole('button', { name: 'Create project' }).click();

  // Project page → upload two photos
  await expect(page.getByRole('heading', { name: 'Smith Roof Replacement' })).toBeVisible();
  await expect(page.getByText('No photos yet')).toBeVisible();
  const files = [
    { name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, '#8a5a2b') },
    { name: 'b.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(page, '#2b5a8a') },
  ];
  await page.getByTestId('upload-input').setInputFiles(files);
  await expect(page.locator('.thumb')).toHaveCount(2);
  await expect(page.locator('.thumb img').first()).toBeVisible();
  // The camera button path uses the same handler.
  await page.getByTestId('camera-input').setInputFiles([{ ...files[0], name: 'c.jpg' }]);
  await expect(page.locator('.thumb')).toHaveCount(3);
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: 'test-results/screens/2-project.png' });

  // Photo detail: stamp, notes, tags
  await page.locator('.thumb').first().click();
  await expect(page.getByTestId('stamp')).toContainText('30.26720, -97.74310');
  await expect(page.getByTestId('stamp')).toContainText('123 Main St');
  await page.getByLabel('Notes').fill('Cracked shingles on north face');
  await page.getByLabel('Tags').fill('Roof, #damage');
  await page.getByRole('button', { name: 'Save notes' }).click();
  await expect(page.getByRole('button', { name: '✓ Saved' })).toBeVisible();
  await expect(page.locator('.tag')).toHaveText(['#roof', '#damage']);

  // Markup: draw an arrow and a box
  await page.getByRole('button', { name: /Mark up/ }).click();
  const canvas = page.getByTestId('markup-canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  const drag = async (x1: number, y1: number, x2: number, y2: number) => {
    await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * x2, box.y + box.height * y2, { steps: 5 });
    await page.mouse.up();
  };
  await drag(0.1, 0.1, 0.4, 0.4);
  await page.getByRole('radio', { name: /Box/ }).click();
  await page.getByRole('radio', { name: 'Color #ffcc00' }).click();
  await drag(0.5, 0.5, 0.8, 0.8);
  const redPixel = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')!;
    // Midpoint of the arrow shaft
    const [r, g, b] = ctx.getImageData(Math.round(c.width * 0.25), Math.round(c.height * 0.25), 1, 1).data;
    return { r, g, b };
  });
  expect(redPixel.r).toBeGreaterThan(200);
  expect(redPixel.g).toBeLessThan(120);
  await page.screenshot({ path: 'test-results/screens/3-markup.png' });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Restore original' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/4-photo.png' });

  // Prev/next navigation between photos
  await page.getByRole('link', { name: 'Older photo' }).click();
  await expect(page.getByLabel('Notes')).toHaveValue('');
  await page.getByRole('link', { name: 'Newer photo' }).click();
  await expect(page.getByLabel('Notes')).toHaveValue('Cracked shingles on north face');

  // Everything survives a reload (IndexedDB)
  await page.reload();
  await expect(page.getByLabel('Notes')).toHaveValue('Cracked shingles on north face');
  await expect(page.getByRole('button', { name: 'Restore original' })).toBeVisible();

  // Report
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('link', { name: /Report/ }).click();
  const report = page.getByTestId('report');
  await expect(report.locator('.report-photo')).toHaveCount(3);
  await expect(report).toContainText('Smith Roof Replacement');
  await expect(report).toContainText('Cracked shingles on north face');
  await page.getByLabel('Prepared by').fill('Empire Roofing');
  await page.getByLabel('Summary').fill('Tear-off complete.');
  await expect(report).toContainText('Prepared by Empire Roofing');
  await page.locator('.pick').nth(1).click();
  await expect(report.locator('.report-photo')).toHaveCount(2);
  await page.evaluate(() => {
    (window as unknown as { printed: boolean }).printed = false;
    window.print = () => ((window as unknown as { printed: boolean }).printed = true);
  });
  await page.getByRole('button', { name: /Save as PDF/ }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: boolean }).printed)).toBe(true);
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: 'test-results/screens/5-report.png', fullPage: true });

  // Feed and projects list
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('3 photos · Jane Smith')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/6-projects.png' });
  await page.getByRole('link', { name: 'Feed' }).click();
  await expect(page.locator('.thumb')).toHaveCount(3);
  await expect(page.locator('.thumb').first()).toContainText('Smith Roof Replacement');
  await page.getByRole('link', { name: 'Projects' }).click();
  await page.getByPlaceholder(/Search projects/).fill('zzz');
  await expect(page.getByText('No projects match')).toBeVisible();
  await page.getByPlaceholder(/Search projects/).fill('austin');
  await expect(page.locator('.project-card')).toHaveCount(1);

  // Edit then delete the project
  await page.locator('.project-card').click();
  await page.getByRole('link', { name: 'Edit project' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Smith Roof Replacement');
  await page.getByRole('button', { name: 'Delete project' }).click();
  await expect(page.getByRole('heading', { name: 'Start your first project' })).toBeVisible();
});

test('photo errors are reported, not swallowed', async ({ page }) => {
  await page.goto('/#/projects/new');
  await page.getByLabel('Project name').fill('Bad files');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByTestId('upload-input').setInputFiles([
    { name: 'notes.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') },
  ]);
  await expect(page.getByRole('alert')).toContainText('1 file could not be read');
  await expect(page.locator('.thumb')).toHaveCount(0);
});

test('works offline after first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await context.setOffline(false);
});
