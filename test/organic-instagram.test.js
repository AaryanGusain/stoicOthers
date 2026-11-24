const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const page = fs.readFileSync(path.join(__dirname, '..', 'apps', 'organic-instagram', 'index.html'), 'utf8');
const helper = fs.readFileSync(path.join(__dirname, '..', 'apps', 'organic-instagram', 'in-app-browser.js'), 'utf8');

test('organic Instagram page presents official app branding and store badges', () => {
  assert.match(page, /<h1[^>]*>Stoic Widgets<\/h1>/);
  assert.match(page, /Daily Stoic wisdom on your Home Screen and Lock Screen\./);
  assert.match(page, /download-on-app-store\.svg/);
  assert.match(page, /get-it-on-google-play\.png/);
  assert.match(page, /Privacy Policy/);
  assert.match(page, /Terms/);
  assert.match(page, /Support/);
});

test('both store CTAs use tracked AppsFlyer attribution links', () => {
  const badges = [...page.matchAll(/<a\b([^>]*)>/g)].filter((match) => match[1].includes('data-download-link'));
  assert.equal(badges.length, 2);
  const appStore = badges.find((match) => match[1].includes('badge-app-store'));
  const googlePlay = badges.find((match) => match[1].includes('badge-google-play'));
  const href = (badge) => new URL(badge[1].match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'));
  assert.equal(href(appStore).href, 'https://stoicwidgets.onelink.me/wn42/instagram');
  const android = href(googlePlay);
  assert.equal(android.origin, 'https://app.appsflyer.com');
  assert.equal(android.pathname, '/com.aaryangusain.stoicwidgets');
  assert.equal(android.searchParams.get('pid'), 'instagram_organic');
  assert.equal(android.searchParams.get('c'), 'instagram_bio');
  assert.doesNotMatch(page, /data-download-link[^>]*target=/);
});

test('Meta browser helper performs synchronous platform-specific handoffs', () => {
  for (const token of ['Instagram', 'Threads', 'FBAN', 'FBAV', 'FB_IAB', 'Messenger']) {
    assert.ok(helper.includes(token), `${token} detection should be present`);
  }
  assert.match(helper, /instagram:\/\/extbrowser\/\?url=/);
  assert.match(helper, /x-safari-/);
  assert.match(helper, /intent:\/\//);
  assert.match(helper, /event\.preventDefault\(\);[\s\S]*openOutsideMeta\(link\.href/);
});

test('blocked handoffs expose retry, manual steps, and copy-link fallback', () => {
  assert.match(helper, /visibilitychange/);
  assert.match(helper, /pagehide/);
  assert.match(helper, /blur/);
  assert.match(helper, /fallbackDelay \|\| 1500/);
  assert.match(page, /Try opening your browser again/);
  assert.match(page, /Copy download link/);
  assert.match(page, /Open in external browser/);
  assert.match(page, /fallbackDestination = destination/);
  assert.match(page, /writeText\(fallbackDestination\)/);
});
