/* Frontend regression tests: node tests/frontend-regressions.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const fixedNow = Date.parse('2026-11-05T12:00:00Z');
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
}
const source = read('frontend/assets/js/layout.js');
const utilSource = source.slice(source.indexOf('const EloUtil = {'), source.indexOf('\n(function () {'));
const context = vm.createContext({ Date: FixedDate });
vm.runInContext(utilSource + '\nthis.util = EloUtil;', context);
const prazo = (value) => vm.runInContext(`util.prazo(${JSON.stringify(value)})`, context);
const dias = (value) => vm.runInContext(`util.diasAtraso(${JSON.stringify(value)})`, context);

assert.equal(prazo('2026-11-05T15:00:00Z').texto, 'Vence hoje');
assert.equal(prazo('2026-11-06T15:00:00Z').texto, 'Vence em 1 dia');
assert.equal(prazo('2026-11-12T15:00:00Z').texto, 'Vence em 7 dias');
assert.equal(prazo('2026-11-05T10:00:00Z').texto, 'Atrasado desde hoje');
assert.equal(prazo('2026-11-04T15:00:00Z').texto, 'Atrasado há 1 dia');
assert.equal(dias('2026-11-06T15:00:00Z'), -1);
assert.equal(dias('2026-11-12T15:00:00Z'), -7);
assert.equal(prazo('not-a-date').texto, 'Prazo não informado');

const loans = read('frontend/assets/js/emprestimos-ui.js');
const loanCss = read('frontend/assets/css/emprestimos.css');
assert.match(loans, /classList\.toggle\("is-selected"/);
assert.match(loanCss, /#lista-emprestimos tr\[data-item-id\]\.is-selected/);

const maintenanceHtml = read('frontend/pages/manutencoes.html');
const maintenanceJs = read('frontend/assets/js/manutencoes-ui.js');
assert.match(maintenanceHtml, /id="man-inativar"/);
assert.match(maintenanceHtml, /id="man-motivo-inativacao"/);
assert.match(maintenanceJs, /window\.confirm\(/g);
assert.match(maintenanceJs, /ELO\.removerEquipamento/);

const reserveCss = read('frontend/assets/css/novo-emprestimo.css');
assert.match(reserveCss, /\.novo-emprestimo-page form\.split/);
assert.match(reserveCss, /#adicionar-equip/);
console.log('ELO Campus frontend regression tests: PASS');
