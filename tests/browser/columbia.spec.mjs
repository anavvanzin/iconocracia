import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const definition = JSON.parse(readFileSync(new URL('../../site/data/constellations.json', import.meta.url))).find(entry => entry.slug === 'columbia-dois-chamados');
test('Columbia renders both approved cards and accessible reproductions', async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  await page.goto('/constelacoes?slug=columbia-dois-chamados');
  const cards = page.locator('.constellation-work');
  await expect(cards).toHaveCount(2);
  for (const [index, card] of definition.cards.entries()) {
    const rendered = cards.nth(index);
    await expect(rendered.locator('.constellation-meta')).toContainText(card.data);
    await expect(rendered.locator('figcaption')).toContainText(card.caption);
    await expect(rendered.locator('img')).toHaveAttribute('alt', card.texto_alternativo);
    await rendered.locator('img').evaluate(image => image.decode());
    expect(await rendered.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await expect(rendered.locator('a')).toHaveAttribute('href', `acervo.html?item=${card.id}&constelacao=${definition.slug}`);
    await expect(rendered).not.toContainText('500');
  }
  await expect(cards.nth(1).locator('figcaption')).not.toContainText('1917');
  await expect(page.locator('.ex-method-note')).toContainText('A doação em 1917 é uma etapa distinta');
});
