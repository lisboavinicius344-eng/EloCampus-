const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/auth.js'), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

async function submitLogin({ username, password, access }) {
  const listeners = {};
  const elements = {
    'login-erro': { hidden: true, className: 'alert alert-error', textContent: '' },
    'login-btn': { disabled: false, textContent: 'Entrar' },
    login: { value: username, focus() {}, select() {} },
    senha: { value: password, type: 'password', focus() {}, select() {} },
    'senha-toggle': { textContent: 'Mostrar', addEventListener(event, fn) { listeners[`toggle-${event}`] = fn; }, setAttribute() {} },
    lembrar: { checked: false },
    'esqueci-senha': { addEventListener(event, fn) { listeners[`forgot-${event}`] = fn; } },
  };
  const radios = [
    { value: 'usuario', checked: access === 'usuario', addEventListener(event, fn) { listeners[`radio-user-${event}`] = fn; } },
    { value: 'administracao', checked: access === 'administracao', addEventListener(event, fn) { listeners[`radio-admin-${event}`] = fn; } },
  ];
  const form = {
    addEventListener(event, fn) { listeners[`form-${event}`] = fn; },
    querySelectorAll() { return radios; },
    querySelector() { return radios.find((radio) => radio.checked); },
  };
  const document = { getElementById(id) { return id === 'login-form' ? form : elements[id] || null; } };
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const location = { destination: null, replace(url) { this.destination = url; }, href: '' };
  const window = { location };

  vm.runInNewContext(source, {
    document, localStorage, sessionStorage, window, Promise, Set, String, Error,
    setTimeout(callback) { return setTimeout(callback, 0); },
  }, { filename: 'auth.js' });

  await listeners['form-submit']({ preventDefault() {} });
  return {
    destination: location.destination,
    error: elements['login-erro'].textContent,
    errorHidden: elements['login-erro'].hidden,
    session: sessionStorage.getItem('elo.sessao') || localStorage.getItem('elo.sessao'),
  };
}

(async () => {
  const scenarios = [
    { name: 'administrador entra pela área administrativa', input: { username: 'admin', password: 'admin123', access: 'administracao' }, success: true },
    { name: 'aluno entra pela área de usuário', input: { username: 'aluno', password: 'aluno123', access: 'usuario' }, success: true },
    { name: 'servidor entra pela área de usuário comum', input: { username: 'servidor', password: 'servidor123', access: 'usuario' }, success: true },
    { name: 'servidor não entra pela área administrativa', input: { username: 'servidor', password: 'servidor123', access: 'administracao' }, success: false },
    { name: 'aluno não entra pela área administrativa', input: { username: 'aluno', password: 'aluno123', access: 'administracao' }, success: false },
    { name: 'administrador não entra pela área de usuário', input: { username: 'admin', password: 'admin123', access: 'usuario' }, success: false },
    { name: 'senha incorreta é rejeitada', input: { username: 'admin', password: 'incorreta', access: 'administracao' }, success: false },
  ];

  for (const scenario of scenarios) {
    const result = await submitLogin(scenario.input);
    if (scenario.success) {
      assert.equal(result.destination, 'pages/dashboard.html');
      assert.ok(result.session, 'sessão de demonstração deve ser criada após validar o perfil');
      assert.equal(JSON.parse(result.session).senha, undefined, 'a senha nunca deve ser gravada dentro da sessão local');
    } else {
      assert.equal(result.destination, null);
      assert.equal(result.session, null);
      assert.equal(result.errorHidden, false);
    }
    console.log(`PASS: ${scenario.name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
