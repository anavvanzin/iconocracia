import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
});

// Measure rendered colors, including transparent controls over their ancestors.
async function contrast(locator, focusRing = false) {
  return locator.evaluate((el, ring) => {
    const rgba = value => value.match(/[\d.]+/g).map(Number);
    const over = (front, back) => front.slice(0, 3).map((c, i) => c * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
    const ancestors = [];
    for (let node = ring ? el.parentElement : el; node; node = node.parentElement) ancestors.unshift(node);
    // The collection uses a two-color background gradient. Check both stops
    // conservatively instead of treating its transparent background-color as white.
    const backgrounds = ancestors.reduce((colors, node) => {
      const style = getComputedStyle(node);
      const base = colors.map(color => over(rgba(style.backgroundColor), color));
      const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
      return stops ? base.flatMap(color => stops.map(stop => over(rgba(stop), color))) : base;
    }, [[255, 255, 255]]);
    const style = getComputedStyle(el);
    const luminance = color => color.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    return Math.min(...backgrounds.map(background => {
      const foreground = over(rgba(ring ? style.outlineColor : style.color), background);
      const a = luminance(foreground), b = luminance(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }));
  }, focusRing);
}

async function tabTo(page, locator) {
  for (let i = 0; i < 200; i++) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate(el => el === document.activeElement)) return;
  }
  throw new Error(`Control unreachable by Tab: ${locator}`);
}

async function readable(page, locator) {
  await expect(locator).toBeVisible();
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await expect.poll(() => contrast(locator), { message: 'normal text contrast' }).toBeGreaterThanOrEqual(4.5);
  await locator.hover();
  await expect.poll(() => contrast(locator), { message: 'hover text contrast' }).toBeGreaterThanOrEqual(4.5);
  await page.mouse.move(0, 0);
  await tabTo(page, locator);
  await expect(locator).toBeFocused();
  expect(await locator.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  await expect(locator).toHaveCSS('outline-style', 'solid');
  await expect.poll(() => contrast(locator), { message: 'focus text contrast' }).toBeGreaterThanOrEqual(4.5);
  await expect.poll(() => contrast(locator, true), { message: 'focus ring contrast' }).toBeGreaterThanOrEqual(3);
}

for (const mode of ['dia', 'noite']) {
  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(mode => localStorage.setItem('iconocracia-modo', mode), mode);
    });

    test('theme control is readable in normal, hover and keyboard focus on every themed page', async ({ page }) => {
      test.setTimeout(60_000); // Five full page loads and three states per control.
      for (const path of ['/', '/acervo', '/sobre', '/constelacoes', '/404']) {
        await page.goto(path);
        const toggle = page.locator('#night-toggle');
        await expect(toggle).toHaveText(mode === 'noite' ? 'DIA' : 'NOITE');
        await readable(page, toggle);
      }
    });

    test('homepage primary and dark actions are readable in all interaction states', async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto('/');
      for (const button of await page.locator('.btn-primary, .btn-dark, .btn-gold').all()) {
        await readable(page, button);
      }
    });

    test('collection primary action is readable and its dialog works with the keyboard', async ({ page }) => {
      // A single-result view exercises the real tab order without traversing
      // all 337 filmstrip thumbnails before reaching the record action.
      await page.goto('/acervo?item=BR-009&visao=palco&q=BR-009');
      await expect(page.locator('.exhibition')).toHaveAttribute('aria-busy', 'false');
      const open = page.locator('#ex-open');
      await readable(page, open);
      await page.keyboard.press('Enter');
      await expect(page.locator('dialog')).toBeVisible();
      await expect(page.locator('.ex-dialog-close')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog')).toBeHidden();
      await expect(open).toBeFocused();
    });
  });
}

test('keyboard theme choice persists across navigation and reload, overriding the system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.locator('#night-toggle');
  await tabTo(page, toggle);
  await toggle.hover();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => contrast(toggle)).toBeGreaterThanOrEqual(4.5);
  await page.mouse.move(0, 0);
  await expect.poll(() => contrast(toggle)).toBeGreaterThanOrEqual(4.5);
  expect(await page.evaluate(() => localStorage.getItem('iconocracia-modo'))).toBe('noite');
  for (const label of ['Acervo', 'Pesquisa e método', 'Constelações', 'Início']) {
    await page.locator('.ex-header nav').getByRole('link', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'noite');
    await expect(toggle).toHaveText('DIA');
  }
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ colorScheme: 'dark' });
  await tabTo(page, toggle);
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(toggle).toHaveText('NOITE');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'noite');
});

test('system dark preference initializes the theme without a saved choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'noite');
  await expect(page.locator('#night-toggle')).toHaveText('DIA');
});

test('reduced motion keeps all 16 cards stationary on hover and keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const cards = page.locator('.const-card');
  await expect(cards).toHaveCount(16);
  await expect(page.locator('.const-field')).toHaveCSS('transform', 'none');
  for (const card of await cards.all()) {
    const resting = await card.evaluate(el => getComputedStyle(el).transform);
    await card.hover();
    await expect(card).toHaveCSS('transform', resting);
    await page.mouse.move(0, 0);
    await tabTo(page, card);
    await expect(card).toHaveCSS('transform', resting);
    await expect(card).toHaveCSS('transition-duration', '0s');
    await expect(card).toHaveCSS('animation-name', 'none');
    await expect(card).toHaveCSS('outline-style', 'solid');
    expect(await contrast(card, true)).toBeGreaterThanOrEqual(3);
  }
  const href = await cards.last().getAttribute('href');
  const destination = new URL(href, page.url());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(url =>
    url.pathname.replace(/\.html$/, '') === destination.pathname.replace(/\.html$/, '') &&
    url.searchParams.get('item') === destination.searchParams.get('item'));
  await expect(page.locator('dialog')).toBeVisible();
});

test('switching to reduced motion during a visit freezes the field and removes color transitions', async ({ page }) => {
  await page.goto('/');
  await page.locator('.const-card').first().hover();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.const-field')).toHaveCSS('transform', 'none');
  await page.mouse.move(500, 400);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(page.locator('.const-field')).toHaveCSS('transform', 'none');
  await page.locator('#night-toggle').click();
  for (const selector of ['.ex-header', '#night-toggle', '.const-card', '.ex-home .block']) {
    await expect(page.locator(selector).first()).toHaveCSS('transition-duration', '0s');
  }
});
