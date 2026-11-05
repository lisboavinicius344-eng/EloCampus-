/* Frontend regression tests: node tests/frontend-regressions.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

// Freeze the clock to make due-date labels deterministic.
const fixedNow = Date.parse('2026-11-05T12:00:00Z');
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
}
const layoutSource = read('frontend/assets/js/layout.js');
const utilSource = layoutSource.slice(layoutSource.indexOf('const EloUtil = {'), layoutSource.indexOf('\n(function () {'));
const dateContext = vm.createContext({ Date: FixedDate });
vm.runInContext(utilSource + '\nthis.util = EloUtil;', dateContext);
const prazo = (value) => vm.runInContext(`util.prazo(${JSON.stringify(value)})`, dateContext);
const dias = (value) => vm.runInContext(`util.diasAtraso(${JSON.stringify(value)})`, dateContext);

assert.equal(prazo('2026-11-05T15:00:00Z').texto, 'Vence hoje', 'a future time today must remain due today');
assert.equal(prazo('2026-11-06T15:00:00Z').texto, 'Vence em 1 dia', 'a deadline tomorrow must not say due today');
assert.equal(prazo('2026-11-12T15:00:00Z').texto, 'Vence em 7 dias', 'a deadline next week must show remaining days');
assert.equal(prazo('2026-11-05T10:00:00Z').texto, 'Atrasado desde hoje', 'a deadline earlier today must be late');
assert.equal(prazo('2026-11-04T15:00:00Z').texto, 'Atrasado há 1 dia', 'a deadline yesterday must show one day late');
assert.equal(dias('2026-11-06T15:00:00Z'), -1, 'daysAtraso must preserve negative remaining days');
assert.equal(dias('2026-11-12T15:00:00Z'), -7, 'daysAtraso must preserve a week remaining');
assert.equal(prazo('not-a-date').texto, 'Prazo não informado', 'invalid dates must not be shown as due today');

// Run the real QR submit handler with a simulated 404 response from the API.
class FakeElement {
  constructor() {
    this.handlers = {};
    this.classList = { add() {}, remove() {} };
    this.files = [];
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.hidden = false;
    this.disabled = false;
  }
  addEventListener(type, callback) { this.handlers[type] = callback; }
  replaceChildren() {}
  focus() {}
  requestSubmit() { this.lastSubmit = this.handlers.submit({ preventDefault() {} }); }
}
const elements = Object.fromEntries([
  'qr-video', 'qr-reader', 'qr-reader-hint', 'abrir-camera', 'qr-arquivo',
  'consulta-form', 'codigo', 'consultar-btn', 'consulta-status', 'resultado', 'qr-permission',
].map((id) => [id, new FakeElement()]));
const qrContext = vm.createContext({
  document: { getElementById: (id) => elements[id] || null },
  window: { addEventListener() {} },
  location: { search: '' },
  URLSearchParams,
  console,
  ELO: { consultaQr: async () => { throw new Error('Nenhum equipamento corresponde a esse código.'); } },
});
vm.runInContext(read('frontend/assets/js/qr.js'), qrContext);
(async () => {
  elements.codigo.value = 'NAO-EXISTE-123';
  await elements['consulta-form'].handlers.submit({ preventDefault() {} });
  assert.equal(elements['consulta-status'].className, 'qr-status is-error', 'QR 404 must use the query status error style');
  assert.equal(elements['consulta-status'].textContent, 'Nenhum equipamento corresponde a esse código.', 'QR 404 message must appear in the query status');
  assert.equal(elements['consultar-btn'].disabled, false, 'QR submit button must be enabled after an error');
  assert.equal(elements['consultar-btn'].textContent, 'Consultar', 'QR submit button label must reset after an error');
  assert.equal(elements['qr-permission'].textContent, '', 'query failures must not be written to the camera permission notice');

  const publicPage = read('frontend/pages/consulta-qr.html');
  const internalPage = read('frontend/pages/consulta-qr-interno.html');
  assert.match(publicPage, /qr\.js\?v=2026\.11\.05\.7/, 'public QR page must request the new script version');
  assert.match(internalPage, /qr\.js\?v=2026\.11\.05\.7/, 'internal QR page must request the new script version');
  assert.match(read('frontend/assets/css/qr.css'), /\.qr-status\.is-error/, 'QR error status styling must exist');

  // The query-string entry point must submit the same form and show the same 404.
  const queryElements = Object.fromEntries(Object.keys(elements).map((id) => [id, new FakeElement()]));
  const queryContext = vm.createContext({
    document: { getElementById: (id) => queryElements[id] || null },
    window: { addEventListener() {} },
    location: { search: '?codigo=NAO-EXISTE-123' },
    URLSearchParams,
    console,
    ELO: { consultaQr: async () => { throw new Error('Nenhum equipamento corresponde a esse código.'); } },
  });
  vm.runInContext(read('frontend/assets/js/qr.js'), queryContext);
  await queryElements['consulta-form'].lastSubmit;
  assert.equal(queryElements.codigo.value, 'NAO-EXISTE-123', 'the query-string code must populate the input');
  assert.equal(queryElements['consulta-status'].textContent, 'Nenhum equipamento corresponde a esse código.', 'query-string lookup failures must be visible');
  assert.equal(queryElements['consultar-btn'].textContent, 'Consultar', 'query-string lookup must also reset the button');

  console.log('ELO Campus frontend regression tests: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
