import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const replacement = 'assets/licensed/replacement.webp';
const image = readFileSync(new URL('../../site/assets/acervo/BR-009.webp', import.meta.url));
const published = { slug: 'image-approved', title: 'Percurso de teste', editorial_status: 'published', item_ids: ['BR-009'] };
const overlay = { version: 1, items: [{
  id: 'BR-009', editorial_status: 'published', imagem: replacement, tem_imagem: true,
  direitos: 'Direitos da reprodução aprovada.', credito: 'Arquivo de teste.',
  fonte_url: 'https://archive.example/catalog', imagem_fonte: 'https://archive.example/reproduction',
}] };

test('approved supplement replaces the actual primary image and attribution in collection and constellation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/data/constellations.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([published]) }));
  await page.route('**/data/publication-overlay.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(overlay) }));
  await page.route('**/' + replacement, route => route.fulfill({ contentType: 'image/webp', body: image }));
  await page.goto('/acervo?item=BR-009&constelacao=image-approved');
  await expect(page.locator('#ex-image img')).toHaveAttribute('src', replacement);
  await expect.poll(() => page.locator('#ex-image img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#ex-source')).toHaveAttribute('href', overlay.items[0].fonte_url);
  await page.locator('#ex-open').click();
  await expect(page.locator('dialog')).toContainText(overlay.items[0].direitos);
  await expect(page.locator('dialog')).toContainText(overlay.items[0].credito);
  await expect(page.getByRole('link', { name: 'Fonte da reprodução' })).toHaveAttribute('href', overlay.items[0].imagem_fonte);
  await expect(page.locator('dialog img')).toHaveAttribute('src', replacement);
  await page.keyboard.press('Escape');
  await page.goto('/constelacoes?slug=image-approved');
  await expect(page.locator('#constellation-items img')).toHaveAttribute('src', replacement);
  expect(errors).toEqual([]);
});
