const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const input = path.join(root, 'apps/book/preview.html');
  const output = path.join(root, 'apps/book/downloads/14-days-to-a-stoic-mind.pdf');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${input}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: output,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.65in',
      right: '0.72in',
      bottom: '0.7in',
      left: '0.72in'
    },
    preferCSSPageSize: false
  });
  await browser.close();
  console.log(`Wrote ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
