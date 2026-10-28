const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/auth.js'), 'utf8');
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k), values };
}
function el() {
  return {
    value: '', checked: false, type: '', textContent: '', className: '', hidden: false, disabled: false,
    listeners: {}, attrs: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type) { for (const fn of this.listeners[type] || []) fn({ preventDefault() {} }); },
    setAttribute(k, v) { this.attrs[k] = v; }, focus() {},
    querySelector() { return { hidden: false, textContent: '' }; },
    closest() { return { querySelector: () => ({ textContent: '' }) }; },
  };
}
const nodes = {
  'login-form': el(), 'login-erro': el(), 'login-btn': el(), login: el(), senha: el(), 'senha-toggle': el(), lembrar: el(),
};
nodes['login-form'].querySelector = (selector) => selector.includes('label') ? { textContent: '' } : { hidden: false };
nodes['login-form'].closest = () => ({ querySelector: () => ({ textContent: '' }) });
const document = { getElementById: id => nodes[id] || null, querySelector: () => ({ textContent: '' }) };
const localStorage = storage({ 'elo.login.salvo': 'antigo@instituicao.edu.br' });
const sessionStorage = storage();
const window = { ELO_API_BASE_URL: '', location: { pathname: '/index.html', search: '', href: '', replace() {} }, history: { replaceState() {} } };
const context = { document, window, localStorage, sessionStorage, fetch: async () => {}, URLSearchParams, Set, Map, String, Object, JSON, Error, Boolean, console };
vm.createContext(context); vm.runInContext(source, context, { filename: 'auth.js' });
assert.equal(nodes.login.value, 'antigo@instituicao.edu.br');
assert.equal(nodes.lembrar.checked, true);
nodes.lembrar.checked = false; nodes.lembrar.dispatch('change');
assert.equal(localStorage.getItem('elo.login.salvo'), null, 'desmarcar deve apagar o e-mail salvo');
nodes.login.value = 'Pessoa@Instituicao.edu.br'; nodes.lembrar.checked = true; nodes.lembrar.dispatch('change');
assert.equal(localStorage.getItem('elo.login.salvo'), 'pessoa@instituicao.edu.br', 'marcar deve guardar o e-mail normalizado');
nodes.login.value = 'entrada-incompleta'; nodes.login.dispatch('input');
assert.equal(localStorage.getItem('elo.login.salvo'), null, 'não deve manter um endereço antigo se o usuário substituir por texto inválido');
assert.equal(localStorage.getItem('elo.sessao'), null, 'nenhuma sessão deve ser guardada em localStorage');
console.log('PASS: lembrar meu e-mail recupera somente um e-mail válido');
console.log('PASS: desmarcar remove o endereço lembrado');
console.log('PASS: digitação atualiza ou remove o endereço salvo sem guardar senha/token');
