const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium, webkit } = require('playwright');

const appsRoot = path.join(__dirname, '..', 'apps');
const storageKey = 'stoic_widgets_web_funnel_v1';
const stepIds = [
  'outcome', 'practice', 'friction', 'right_place', 'frequency', 'glances',
  'familiarity', 'authors', 'quote', 'effortless', 'widget', 'theme', 'preview',
  'font', 'refresh', 'reminder', 'set_once', 'proof', 'loading', 'email',
  'result', 'paywall'
];
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 360, height: 640 },
  { width: 360, height: 800 },
  { width: 412, height: 915 }
];
const completeAnswers = {
  outcome: 'calmer',
  practice: ['books'],
  friction: ['remember'],
  frequency: 'morning',
  familiarity: 'curious',
  authors: ['marcus'],
  quote: 'marcus',
  widget: 'daily_quote',
  theme: 'solitude',
  themeId: 'solitude-rain-window-chair',
  font: 'roboto',
  refresh: 'daily',
  reminder: 'none'
};

let server;
let baseUrl;

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp'
  }[extension] || 'application/octet-stream';
}

before(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/funnel-event') {
      request.resume();
      response.writeHead(204).end();
      return;
    }
    if (url.pathname === '/api/web-leads') {
      request.resume();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname.startsWith('/api/web-subscriptions/')) {
      request.resume();
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Checkout is not available in this preview yet.' }));
      return;
    }

    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (relative === 'funnel' || relative === 'funnel/') relative = 'funnel/index.html';
    const filePath = path.resolve(appsRoot, relative);
    if (!filePath.startsWith(appsRoot + path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(filePath), 'cache-control': 'no-store' });
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/funnel/`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function preparePage(browserType, options = {}) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: options.viewport || { width: 390, height: 844 },
    reducedMotion: options.reducedMotion || 'no-preference'
  });
  await context.route('https://checkout.razorpay.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: 'window.Razorpay=function(options){this.options=options;this.on=function(){};this.open=function(){if(options.modal&&options.modal.ondismiss)options.modal.ondismiss();};};'
  }));
  const page = await context.newPage();
  await page.goto(baseUrl);
  return { browser, context, page };
}

async function waitForStep(page, id) {
  await page.locator(`main[data-step="${id}"]`).waitFor({ state: 'visible' });
}

async function clickContinue(page) {
  const button = page.locator('[data-action="continue"]');
  assert.equal(await button.count(), 1);
  await button.click();
}

async function jumpToStep(page, step, answers = completeAnswers) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: storageKey,
    value: {
      step,
      answers,
      email: 'qa@example.com',
      marketingConsent: false,
      plan: 'annual',
      sessionId: 'qa-session',
      attribution: {}
    }
  });
  await page.reload();
  await waitForStep(page, stepIds[step]);
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.header-row').getBoundingClientRect();
    const brand = document.querySelector('.brand').getBoundingClientRect();
    const content = document.querySelector('.screen-content');
    const footer = document.querySelector('.action-footer');
    const lastOption = document.querySelector('.option-card:last-child');
    const contentRect = content ? content.getBoundingClientRect() : null;
    const footerRect = footer ? footer.getBoundingClientRect() : null;
    const optionRect = lastOption ? lastOption.getBoundingClientRect() : null;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      brandInside: brand.left >= header.left - 0.5 && brand.right <= header.right + 0.5,
      contentFooterClear: !contentRect || !footerRect || footerRect.top >= contentRect.bottom - 0.5,
      optionFooterClear: !optionRect || !footerRect || footerRect.top >= optionRect.bottom - 0.5,
      footerPosition: footer ? getComputedStyle(footer).position : null
    };
  });
}

test('fresh sessions show a short pre-funnel promise without changing the 22-step journey', async () => {
  const { browser, page } = await preparePage(chromium);
  try {
    await page.locator('.funnel-intro').waitFor({ state: 'visible' });
    assert.match(await page.locator('#funnel-intro-title').innerText(), /simplify your daily practice/i);
    assert.equal(await page.locator('.intro-progress-fill').count(), 1);
    assert.equal(await page.locator('.funnel-shell').count(), 0);
    await waitForStep(page, 'outcome');
    assert.equal(await page.locator('.step-counter').innerText(), '1 / 22');
  } finally {
    await browser.close();
  }
});

test('Chromium completes all 22 funnel screens with live personalization and persistence', { timeout: 45_000 }, async () => {
  const { browser, page } = await preparePage(chromium);
  try {
    await page.evaluate((key) => localStorage.removeItem(key), storageKey);
    await page.reload();
    await waitForStep(page, 'outcome');
    assert.equal(await page.locator('.option-emoji').count(), 4);
    assert.equal(await page.locator('.back-button.is-placeholder').count(), 1);

    await page.locator('[data-option="calmer"]').click();
    await waitForStep(page, 'practice');
    await page.locator('[data-option="books"]').click();
    await page.locator('[data-option="journaling"]').click();
    assert.equal(await page.locator('[data-action="continue"]').isEnabled(), true);

    await page.locator('[data-action="back"]').click();
    await waitForStep(page, 'outcome');
    assert.equal(await page.locator('[data-option="calmer"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-option="calmer"]').click();
    await waitForStep(page, 'practice');
    await clickContinue(page);

    await waitForStep(page, 'friction');
    await page.locator('[data-option="remember"]').click();
    await clickContinue(page);
    await waitForStep(page, 'right_place');
    await clickContinue(page);
    await waitForStep(page, 'frequency');
    await page.locator('[data-option="few_times"]').click();
    await waitForStep(page, 'glances');
    await clickContinue(page);
    await waitForStep(page, 'familiarity');
    await page.locator('[data-option="curious"]').click();
    await waitForStep(page, 'authors');
    await page.locator('[data-option="marcus"]').click();
    await page.locator('[data-option="seneca"]').click();
    await clickContinue(page);
    await waitForStep(page, 'quote');
    await page.locator('[data-quote="marcus"]').click();
    await clickContinue(page);
    await waitForStep(page, 'effortless');
    await clickContinue(page);

    await waitForStep(page, 'widget');
    assert.equal(await page.locator('.screen h1').innerText(), 'Which one speaks to you?');
    assert.match(await page.locator('.swipe-note').innerText(), /add or switch anytime/i);
    const widgetIds = ['daily_quote', 'sisyphus', 'memento_mori', 'retro', 'year_progress'];
    for (const widgetId of widgetIds) {
      await page.locator(`[data-widget="${widgetId}"]`).click();
      assert.equal(await page.locator(`[data-widget="${widgetId}"] [data-widget-renderer="${widgetId}"]`).count(), 1);
    }
    await page.locator('[data-widget="daily_quote"]').click();
    await page.reload();
    await waitForStep(page, 'widget');
    assert.equal(await page.locator('[data-widget="daily_quote"]').getAttribute('aria-pressed'), 'true');
    await clickContinue(page);

    await waitForStep(page, 'theme');
    assert.equal(await page.locator('[data-theme-bundle]').count(), 3);
    await page.locator('[data-theme-bundle="discipline"]').click();
    assert.equal(await page.locator('.theme-panel:not([hidden]) [data-theme-id]').count(), 12);
    await page.locator('[data-theme-bundle="philosophers"]').click();
    assert.equal(await page.locator('.theme-panel:not([hidden]) [data-theme-id]').count(), 5);
    await page.locator('[data-theme-bundle="solitude"]').click();
    assert.equal(await page.locator('.theme-panel:not([hidden]) [data-theme-id]').count(), 12);
    await page.locator('[data-theme-id="solitude-rain-window-chair"]').click();
    await clickContinue(page);

    await waitForStep(page, 'preview');
    assert.equal(await page.locator('.home-screen-preview').getAttribute('data-widget-id'), 'daily_quote');
    assert.equal(await page.locator('.home-screen-preview').getAttribute('data-theme-id'), 'solitude-rain-window-chair');
    assert.equal(await page.locator('.home-screen-wallpaper').getAttribute('src'), '/funnel/assets/themes/solitude-rain-window-chair.webp');
    assert.equal(await page.locator('.home-screen-widget [data-widget-renderer="daily_quote"]').getAttribute('data-theme-id'), 'solitude-rain-window-chair');
    assert.equal(await page.locator('.home-screen-app-row .home-screen-app').count(), 4);
    assert.equal(await page.locator('.home-screen-dock .home-screen-app').count(), 4);
    const homeScreenFit = await page.evaluate(() => {
      const phone = document.querySelector('.home-screen-preview').getBoundingClientRect();
      const dock = document.querySelector('.home-screen-dock').getBoundingClientRect();
      const icons = Array.from(document.querySelectorAll('.home-screen-app-row img')).map((node) => node.getBoundingClientRect());
      const centerGaps = icons.slice(1).map((rect, index) => (rect.x + rect.width / 2) - (icons[index].x + icons[index].width / 2));
      return {
        dockInside: dock.bottom <= phone.bottom - 1,
        equalIcons: icons.every((rect) => Math.abs(rect.width - icons[0].width) < 0.25 && Math.abs(rect.height - icons[0].height) < 0.25),
        evenCenters: centerGaps.every((gap) => Math.abs(gap - centerGaps[0]) < 0.5)
      };
    });
    assert.deepEqual(homeScreenFit, { dockInside: true, equalIcons: true, evenCenters: true });
    await clickContinue(page);

    await waitForStep(page, 'font');
    assert.equal(await page.locator('[data-font]').count(), 4);
    const fontIds = ['serif', 'roboto', 'typewriter', 'handwritten'];
    for (const fontId of fontIds) {
      await page.locator(`[data-font="${fontId}"]`).click();
      assert.equal(await page.locator('.font-live-preview [data-widget-renderer]').count(), 1);
    }
    await page.locator('[data-font="roboto"]').click();
    await clickContinue(page);

    await waitForStep(page, 'refresh');
    await page.locator('[data-option="daily"]').click();
    await waitForStep(page, 'reminder');
    await page.locator('[data-option="none"]').click();
    await waitForStep(page, 'set_once');
    await clickContinue(page);
    await waitForStep(page, 'proof');
    await clickContinue(page);
    await waitForStep(page, 'loading');
    assert.equal(await page.locator('[role="progressbar"]').count(), 1);
    assert.equal(await page.locator('.loading-stage').count(), 3);
    assert.equal(await page.locator('.loading-stage-fill').count(), 3);
    assert.equal(await page.locator('.loading-percent').count(), 3);
    await page.waitForFunction(() => {
      const progress = Array.from(document.querySelectorAll('[data-loading-stage]')).map((node) => Number(node.dataset.progress));
      return progress[0] > 0 && progress[0] < 100 && progress[1] === 0 && progress[2] === 0;
    });
    const firstStagePercent = await page.locator('.loading-stage[data-loading-stage="0"] .loading-percent').innerText();
    assert.match(firstStagePercent, /^\d+%$/);
    await page.waitForFunction(() => {
      const progress = Array.from(document.querySelectorAll('[data-loading-stage]')).map((node) => Number(node.dataset.progress));
      return progress[0] === 100 && progress[1] > 0 && progress[1] < 100 && progress[2] === 0;
    }, null, { timeout: 7_000 });
    await page.waitForFunction(() => {
      const progress = Array.from(document.querySelectorAll('[data-loading-stage]')).map((node) => Number(node.dataset.progress));
      return progress[0] === 100 && progress[1] === 100 && progress[2] > 0 && progress[2] < 100;
    }, null, { timeout: 7_000 });
    await page.locator('[role="progressbar"][aria-valuenow="100"]').waitFor({ state: 'visible', timeout: 15_000 });
    assert.equal(await page.locator('.loading-stage.is-ready').count(), 3);
    assert.deepEqual(await page.locator('.loading-stage').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.progress))), [100, 100, 100]);
    assert.deepEqual(await page.locator('.loading-percent').allTextContents(), ['100%', '100%', '100%']);
    assert.equal(await page.locator('#loading-status').innerText(), 'Your plan is ready.');
    await waitForStep(page, 'email');

    await page.locator('#email').fill('not-an-email');
    await page.locator('#email-form button[type="submit"]').click();
    assert.equal(await page.locator('#email-message').innerText(), 'Enter a valid email address.');
    await page.locator('#email').fill('qa@example.com');
    await page.locator('#email-form button[type="submit"]').click();
    await waitForStep(page, 'result');
    assert.equal(await page.locator('.result-widget [data-widget-renderer="daily_quote"]').getAttribute('data-theme-id'), 'solitude-rain-window-chair');
    await clickContinue(page);
    await waitForStep(page, 'paywall');
    await page.locator('[data-plan="weekly"]').click();
    assert.equal(await page.locator('[data-plan="weekly"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.checkout-button').innerText(), /weekly/);
  } finally {
    await browser.close();
  }
});

test('loading uses discrete reduced-motion progress and cancels when navigating back', { timeout: 35_000 }, async () => {
  const { browser, page } = await preparePage(chromium, { reducedMotion: 'reduce' });
  try {
    await jumpToStep(page, 18);
    const values = await page.evaluate(() => new Promise((resolve) => {
      const found = [0];
      const node = document.querySelector('[role="progressbar"]');
      const observer = new MutationObserver(() => {
        const value = Number(node.getAttribute('aria-valuenow'));
        if (found[found.length - 1] !== value) found.push(value);
        if (value === 100) {
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(node, { attributes: true, attributeFilter: ['aria-valuenow'] });
    }));
    assert.deepEqual(values, [0, 33, 67, 100]);
    assert.deepEqual(await page.locator('.loading-stage').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.progress))), [100, 100, 100]);
    await waitForStep(page, 'email');
    await page.locator('[data-action="back"]').click();
    await waitForStep(page, 'loading');
    await page.locator('[data-action="back"]').click();
    await waitForStep(page, 'proof');
    await page.waitForTimeout(10_400);
    await waitForStep(page, 'proof');
  } finally {
    await browser.close();
  }
});

test('email and checkout API errors stay actionable', async () => {
  const { browser, page } = await preparePage(chromium);
  try {
    await page.route('**/api/web-leads', (route) => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Please try again in a moment.' })
    }));
    await jumpToStep(page, 19);
    await page.locator('#email').fill('qa@example.com');
    await page.locator('#email-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#email-message').textContent.length > 0);
    assert.equal(await page.locator('#email-message').innerText(), 'Please try again in a moment.');
    assert.equal(await page.locator('#email-form button[type="submit"]').isEnabled(), true);

    await jumpToStep(page, 21);
    await page.locator('.checkout-button').click();
    await page.waitForFunction(() => document.querySelector('#checkout-error').textContent.length > 0);
    assert.equal(await page.locator('#checkout-error').innerText(), 'Checkout is not available in this preview yet.');
    assert.equal(await page.locator('.checkout-button').isEnabled(), true);
  } finally {
    await browser.close();
  }
});

test('legacy state migrates in place and selection events include app mappings', async () => {
  const { browser, page } = await preparePage(chromium);
  const eventResolvers = {};
  try {
    await page.route('**/api/funnel-event', async (route) => {
      const event = route.request().postDataJSON();
      if (eventResolvers[event.event]) eventResolvers[event.event](event);
      await route.fulfill({ status: 204 });
    });
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
      step: 10,
      answers: { widget: 'daily_quote', theme: 'philosophers', font: 'cormorant' },
      sessionId: 'legacy-session'
    })), storageKey);
    await page.reload();
    await waitForStep(page, 'widget');
    const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(migrated.answers.font, 'serif');
    assert.equal(migrated.answers.theme, 'philosophers');
    assert.equal(migrated.answers.themeId, 'wisdom-marcus-aurelius-head');

    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
      step: 13,
      answers: { widget: 'daily_quote', theme: 'discipline', themeId: 'discipline-forge-anvil-sparks', font: 'courier' },
      sessionId: 'legacy-courier-session'
    })), storageKey);
    await page.reload();
    await waitForStep(page, 'font');
    let remapped = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(remapped.answers.font, 'typewriter');

    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
      step: 13,
      answers: { widget: 'daily_quote', theme: 'solitude', themeId: 'solitude-empty-dock-lake', font: 'dynamic' },
      sessionId: 'legacy-dynamic-session'
    })), storageKey);
    await page.reload();
    await waitForStep(page, 'font');
    remapped = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(remapped.answers.font, 'handwritten');

    await jumpToStep(page, 10, { ...completeAnswers, theme: 'philosophers', themeId: 'wisdom-marcus-aurelius-head' });

    const widgetEventReady = new Promise((resolve) => { eventResolvers.funnel_widget_selected = resolve; });
    await page.locator('[data-widget="memento_mori"]').click();
    await page.waitForFunction(() => document.querySelector('[data-widget="memento_mori"]').getAttribute('aria-pressed') === 'true');
    const widgetEvent = await widgetEventReady;
    assert.equal(widgetEvent.properties.app_widget_type, 'memento');

    await jumpToStep(page, 11, { ...completeAnswers, theme: 'discipline', themeId: 'discipline-spartan-helmet-stone' });
    const themeEventReady = new Promise((resolve) => { eventResolvers.funnel_theme_selected = resolve; });
    await page.locator('[data-theme-id="discipline-forge-anvil-sparks"]').click();
    await page.waitForFunction(() => document.querySelector('[data-theme-id="discipline-forge-anvil-sparks"]').getAttribute('aria-pressed') === 'true');
    const themeEvent = await themeEventReady;
    assert.equal(themeEvent.properties.theme_id, 'discipline-forge-anvil-sparks');
    assert.equal(themeEvent.properties.theme_bundle, 'discipline');
  } finally {
    await browser.close();
  }
});

test('same-screen selections stay painted in place without duplicate screen views', async () => {
  const { browser, page } = await preparePage(chromium, { viewport: { width: 320, height: 568 } });
  const events = [];
  try {
    await page.route('**/api/funnel-event', async (route) => {
      events.push(route.request().postDataJSON());
      await route.fulfill({ status: 204 });
    });

    await jumpToStep(page, 1, { ...completeAnswers, practice: ['books'] });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.evaluate(() => {
      window.__stableContent = document.querySelector('.screen-content');
      window.__optionGeometry = Array.from(document.querySelectorAll('[data-option]')).map((node) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    });
    await page.locator('[data-option="journaling"]').click();
    assert.equal(await page.evaluate(() => window.__stableContent === document.querySelector('.screen-content')), true);
    const optionGeometryAfter = await page.evaluate(() => Array.from(document.querySelectorAll('[data-option]')).map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    const optionGeometryBefore = await page.evaluate(() => window.__optionGeometry);
    assert.equal(optionGeometryAfter.length, optionGeometryBefore.length);
    optionGeometryAfter.forEach((rect, index) => {
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(rect[key] - optionGeometryBefore[index][key]) <= 0.25, `option ${index} ${key} moved by more than a sub-pixel`);
      }
    });
    await page.waitForTimeout(80);
    assert.equal(events.filter((event) => event.event === 'funnel_screen_viewed' && event.step_id === 'practice').length, 1);

    await jumpToStep(page, 10);
    await page.evaluate(() => {
      window.__stableContent = document.querySelector('.screen-content');
      window.__stableCarousel = document.querySelector('.carousel');
      window.__stableCarousel.scrollLeft = 160;
      window.scrollTo(0, 70);
      window.__stableScrollY = window.scrollY;
      document.querySelector('[data-widget="retro"]').click();
    });
    assert.equal(await page.evaluate(() => window.__stableContent === document.querySelector('.screen-content')), true);
    assert.equal(await page.evaluate(() => window.__stableCarousel === document.querySelector('.carousel')), true);
    assert.equal(await page.evaluate(() => window.scrollY === window.__stableScrollY), true);

    await jumpToStep(page, 11);
    await page.evaluate(() => {
      window.__stableContent = document.querySelector('.screen-content');
      window.__stableThemePanels = Array.from(document.querySelectorAll('[data-theme-panel]'));
    });
    await page.locator('[data-theme-bundle="philosophers"]').click();
    assert.equal(await page.evaluate(() => window.__stableContent === document.querySelector('.screen-content')), true);
    assert.equal(await page.evaluate(() => window.__stableThemePanels.every((panel, index) => panel === document.querySelectorAll('[data-theme-panel]')[index])), true);
    assert.equal(await page.locator('.theme-panel:not([hidden]) [data-theme-id]').count(), 5);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-theme-bundle="discipline"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.theme-panel:not([hidden]) [data-theme-id]').count(), 12);

    await jumpToStep(page, 13, { ...completeAnswers, widget: 'retro' });
    await page.evaluate(() => {
      window.__stableContent = document.querySelector('.screen-content');
      window.__stableWidget = document.querySelector('.font-live-preview [data-widget-renderer]');
    });
    assert.equal(await page.locator('.font-live-preview [data-widget-renderer]').getAttribute('data-widget-renderer'), 'daily_quote');
    await page.locator('[data-font="typewriter"]').click();
    assert.equal(await page.evaluate(() => window.__stableContent === document.querySelector('.screen-content')), true);
    assert.equal(await page.evaluate(() => window.__stableWidget === document.querySelector('.font-live-preview [data-widget-renderer]')), true);
    assert.equal(await page.locator('.font-live-preview [data-widget-renderer]').getAttribute('data-font-id'), 'typewriter');
    assert.equal(await page.locator('.font-live-preview [data-widget-renderer]').evaluate((node) => getComputedStyle(node).animationName), 'none');

    await jumpToStep(page, 21);
    await page.evaluate(() => { window.__stableContent = document.querySelector('.screen-content'); });
    await page.locator('[data-plan="weekly"]').click();
    assert.equal(await page.evaluate(() => window.__stableContent === document.querySelector('.screen-content')), true);
  } finally {
    await browser.close();
  }
});

test('study proof, authentic product interludes, and native Retro renderer use the requested evidence', async () => {
  const { browser, page } = await preparePage(chromium);
  try {
    await jumpToStep(page, 5);
    assert.match(await page.locator('.evidence-card').innerText(), /15× more/);
    assert.match(await page.locator('.study-note').innerText(), /Stoic Widgets user study/i);
    assert.equal(await page.locator('.exposure-chart[role="img"]').count(), 1);
    assert.equal(await page.locator('.exposure-column').count(), 2);
    assert.match(await page.locator('.exposure-column.is-baseline').innerText(), /1×/);
    assert.match(await page.locator('.exposure-column.is-highlight').innerText(), /15×/);

    await jumpToStep(page, 3);
    assert.match(await page.locator('.benefit-composition').getAttribute('aria-label'), /Home Screen and Lock Screen/i);
    assert.equal(await page.locator('.benefit-composition-bg').getAttribute('src'), '/funnel/assets/benefit-right-place-bg.webp');
    assert.equal(await page.locator('.benefit-shot').count(), 2);
    assert.match(await page.locator('.benefit-shot.is-home-screen').getAttribute('src'), /right-place-home-blue\.webp$/);
    assert.match(await page.locator('.benefit-shot.is-lock-screen').getAttribute('src'), /right-place-lock-black\.webp$/);

    await jumpToStep(page, 9);
    assert.match(await page.locator('.benefit-composition').getAttribute('aria-label'), /three authentic Stoic quote widgets/i);
    assert.equal(await page.locator('.benefit-composition-bg').getAttribute('src'), '/funnel/assets/benefit-effortless-bg.webp');
    assert.equal(await page.locator('.benefit-shot').count(), 3);
    assert.match(await page.locator('.benefit-shot.is-widget-blue').getAttribute('src'), /effortless-quote-blue\.webp$/);
    assert.match(await page.locator('.benefit-shot.is-widget-dark').getAttribute('src'), /effortless-quote-dark\.webp$/);
    assert.match(await page.locator('.benefit-shot.is-widget-fire').getAttribute('src'), /effortless-quote-fire\.webp$/);
    assert.equal(await page.locator('.benefit-shot.is-widget-blue').evaluate((node) => getComputedStyle(node).animationName), 'effortless-card-cycle');

    await jumpToStep(page, 10, { ...completeAnswers, widget: 'retro' });
    assert.equal(await page.locator('[data-widget="retro"] .retro-row').count(), 5);
    assert.equal(await page.locator('[data-widget="retro"] .retro-bars i').count(), 125);
    assert.equal(await page.locator('[data-widget="retro"] .retro-bars').first().locator('i').count(), 25);
    assert.match(await page.locator('[data-widget="retro"] .retro-header').innerText(), /V\.1\.0\.4/);

    await jumpToStep(page, 11, { ...completeAnswers, widget: 'retro' });
    assert.equal(await page.locator('.screen h1').innerText(), 'Choose a quote theme too.');
    assert.equal(await page.locator('[data-action="continue"]').innerText(), 'Save this quote theme');

    await jumpToStep(page, 12, { ...completeAnswers, widget: 'retro' });
    assert.equal(await page.locator('.screen h1').innerText(), 'See your starting widget.');
    assert.equal(await page.locator('.home-screen-preview').getAttribute('data-widget-id'), 'retro');
    assert.equal(await page.locator('.home-screen-widget [data-widget-renderer="retro"]').count(), 1);
    assert.equal(await page.locator('.home-screen-wallpaper').getAttribute('src'), '/funnel/assets/themes/solitude-rain-window-chair.webp');

    await jumpToStep(page, 12, { ...completeAnswers, widget: 'year_progress' });
    assert.equal(await page.locator('.home-screen-preview').getAttribute('data-widget-id'), 'year_progress');
    assert.equal(await page.locator('.home-screen-widget [data-widget-renderer="year_progress"] .year-grid i').count(), 365);
    assert.match(await page.locator('.home-screen-widget .year-header').innerText(), /2026/);

    await jumpToStep(page, 16);
    const studyText = await page.locator('.mindfulness-evidence').innerText();
    assert.match(studyText, /\+35%/);
    assert.match(studyText, /less distracted/i);
    assert.match(studyText, /self-reported/i);
    assert.equal(await page.locator('.index-chart').getAttribute('data-index-series'), '100,135');
    assert.equal(await page.locator('.index-chart').getAttribute('data-line-style'), 'curved');
    assert.deepEqual(await page.locator('.index-point').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.indexValue))), [100, 135]);
    assert.match(await page.locator('.index-line').getAttribute('d'), /C/);
    assert.equal(await page.locator('.index-line-echo').count(), 1);
    assert.equal(await page.locator('.index-column').count(), 0);
    assert.match(await page.locator('.index-chart').getAttribute('aria-label'), /one hundred before to one hundred thirty-five/i);

    await jumpToStep(page, 17);
    assert.equal(await page.locator('.social-aurelius').getAttribute('src'), '/funnel/assets/social-proof-aurelius.webp');
    assert.equal(await page.locator('.social-stars').getAttribute('src'), '/funnel/assets/social-proof-stars-laurels.webp');
    assert.match(await page.locator('.rating-row').innerText(), /4\.8[\s\S]*169 App Store ratings/);
    assert.match(await page.locator('.review').innerText(), /Perfect for any stoicism lover/);
  } finally {
    await browser.close();
  }
});

test('the effortless widget deck becomes a static fan with reduced motion', async () => {
  const { browser, page } = await preparePage(chromium, { reducedMotion: 'reduce' });
  try {
    await jumpToStep(page, 9);
    const cards = page.locator('.benefit-composition.is-effortless .benefit-shot');
    assert.equal(await cards.count(), 3);
    assert.deepEqual(await cards.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName)), ['none', 'none', 'none']);
    assert.deepEqual(await cards.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).opacity)), ['1', '0.82', '1']);
  } finally {
    await browser.close();
  }
});

for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${engineName} has no mobile overflow, header clipping, or CTA intersections`, { timeout: 90_000 }, async () => {
    const { browser, page } = await preparePage(engine, { viewport: viewports[0] });
    try {
      const keySteps = [0, 1, 5, 9, 10, 11, 12, 13, 16, 17, 18, 20, 21];
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const step of keySteps) {
          await jumpToStep(page, step);
          const metrics = await layoutMetrics(page);
          assert.ok(metrics.scrollWidth <= metrics.innerWidth + 1, `${engineName} ${viewport.width}x${viewport.height} step ${stepIds[step]} overflowed horizontally`);
          assert.equal(metrics.brandInside, true, `${engineName} ${viewport.width}x${viewport.height} step ${stepIds[step]} clipped the brand`);
          assert.equal(metrics.contentFooterClear, true, `${engineName} ${viewport.width}x${viewport.height} step ${stepIds[step]} overlapped content and CTA`);
          assert.equal(metrics.optionFooterClear, true, `${engineName} ${viewport.width}x${viewport.height} step ${stepIds[step]} obscured the final option`);
          if (metrics.footerPosition) assert.notEqual(metrics.footerPosition, 'fixed');
        }
      }
    } finally {
      await browser.close();
    }
  });
}

test('every screen renders with stable shell semantics', async () => {
  const { browser, page } = await preparePage(chromium);
  try {
    for (let step = 0; step < stepIds.length; step += 1) {
      await jumpToStep(page, step);
      assert.equal(await page.locator(`main[data-step="${stepIds[step]}"]`).count(), 1);
      assert.equal(await page.locator('.brand').innerText(), 'Stoic Widgets');
      assert.equal(await page.locator('.progress-track').count(), 1);
      assert.equal(await page.locator('.screen-subtitle').count(), 0);
    }
  } finally {
    await browser.close();
  }
});
