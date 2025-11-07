import { test, expect } from '@playwright/test';

test('resume a11y basics', async ({ page }) => {
  await page.goto('/resume');
  const h1 = await page.locator('h1').first().textContent();
  expect(h1).toBeTruthy();
  const linkCount = await page.locator('a').count();
  expect(linkCount).toBeGreaterThan(0);
});
