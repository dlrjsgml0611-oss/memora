import { expect, test } from '@playwright/test';

test.describe('smoke routes', () => {
  test('loads landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Memora')).toBeVisible();
  });

  test('loads login page with input controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '학습 시작하기' })).toBeVisible();
  });
});
