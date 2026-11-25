// E2E del panel contra el dev server local, que escribe en GITHUB_BRANCH
// (admin-sandbox). Uso: E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { E2E_EMAIL, E2E_PASSWORD } = process.env;
assert.ok(E2E_EMAIL && E2E_PASSWORD, 'Define E2E_EMAIL y E2E_PASSWORD');
const FIXTURE = fileURLToPath(new URL('./fixture.jpg', import.meta.url));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const step = name => console.log(`• ${name}`);

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('dialog', dialog => dialog.accept());
  return page;
}

// Marca cada <label> con su texto para ubicar campos como lo haría una persona.
const tagLabels = page =>
  page.$$eval('label', labels => labels.forEach(l => (l.dataset.label = (l.querySelector('span')?.firstChild?.textContent ?? '').trim())));

async function fill(page, label, value) {
  await tagLabels(page);
  const input = await page.$(`label[data-label="${label}"] input, label[data-label="${label}"] textarea`);
  assert.ok(input, `No encontré el campo «${label}»`);
  await input.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (value) await input.type(value);
}

const save = page => page.click('div.fixed button');
const waitForStatus = (page, text, timeout = 60000) =>
  page.waitForFunction(t => document.querySelector('[role=status]')?.textContent?.includes(t), { timeout }, text);

const page = await openPage();
try {
  step('redirige a login sin sesión');
  await page.goto(`${BASE}/admin/propiedades`);
  assert.match(page.url(), /\/admin\/login\?next=%2Fadmin%2Fpropiedades/);

  step('rechaza contraseña incorrecta');
  await page.type('input[name=email]', E2E_EMAIL);
  await page.type('input[name=password]', 'incorrecta');
  await page.click('button[type=submit]');
  await page.waitForSelector('#login-error:not(.hidden)');

  step('entra y vuelve a la página pedida');
  await page.$eval('input[name=password]', el => (el.value = ''));
  await page.type('input[name=password]', E2E_PASSWORD);
  await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  assert.match(page.url(), /\/admin\/propiedades$/);

  step('crea una propiedad oculta con una foto');
  await page.goto(`${BASE}/admin/propiedades/nueva`, { waitUntil: 'networkidle0' });
  const name = `Prueba E2E ${Date.now()}`;
  await fill(page, 'Nombre', name);
  await fill(page, 'Precio', '$1 MXN');
  await fill(page, 'Ubicación', 'Chihuahua');
  await fill(page, 'Descripción corta', 'Propiedad de prueba automática.');
  await fill(page, 'Terreno (m²)', '100');
  await tagLabels(page);
  await page.click('label[data-label="Ocultar del sitio"] input');
  const fileInput = await page.$('input[type=file]');
  await fileInput.uploadFile(FIXTURE);
  await page.waitForFunction(() => document.querySelectorAll('li img').length === 1 && !document.body.textContent.includes('Procesando…'), { timeout: 60000 });
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), save(page)]);
  assert.match(page.url(), /\/admin\/propiedades\/prueba-e2e-\d+$/);

  step('la foto nueva se ve aunque el sitio aún no la publique');
  await page.evaluate(() => document.querySelector('li img')?.scrollIntoView());
  await page.waitForFunction(() => {
    const img = document.querySelector('li img');
    return img && img.complete && img.naturalWidth > 0;
  }, { timeout: 30000 });

  step('muestra error por campo al vaciar el precio');
  await fill(page, 'Precio', '');
  await save(page);
  await page.waitForFunction(() => document.body.textContent.includes('Este campo es obligatorio'), { timeout: 30000 });

  step('detecta conflicto con dos pestañas');
  const other = await openPage();
  await other.goto(page.url(), { waitUntil: 'networkidle0' });
  await fill(other, 'Precio', '$2 MXN');
  await save(other);
  await waitForStatus(other, 'Guardado');
  await other.close();
  await fill(page, 'Precio', '$3 MXN');
  await save(page);
  await waitForStatus(page, 'Alguien guardó cambios');

  step('borra la propiedad de prueba y su foto');
  await page.reload({ waitUntil: 'networkidle0' });
  await Promise.all([
    page.waitForNavigation({ timeout: 60000 }),
    page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Borrar «'))?.click()),
  ]);
  assert.match(page.url(), /\/admin\/propiedades$/);
  assert.equal(await page.evaluate(n => document.body.textContent.includes(n), name), false);

  step('cierra sesión');
  await page.goto(`${BASE}/admin`);
  await Promise.all([page.waitForNavigation(), page.click('#admin-logout-desktop')]);
  assert.match(page.url(), /\/admin\/login/);

  console.log('E2E OK');
} finally {
  await browser.close();
}
