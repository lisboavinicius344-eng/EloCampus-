const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const pages = [
  ['frontend/index.html', 'auth-page-login', 'Área segura'],
  ['frontend/pages/cadastro.html', 'auth-page-cadastro', 'Etapa 1'],
  ['frontend/pages/recuperar-senha.html', 'auth-page-recovery', 'Recuperação protegida'],
  ['frontend/pages/trocar-senha.html', 'auth-page-password', 'Etapa final'],
];
for (const [file, bodyClass, uniqueLabel] of pages) { const html = read(file); assert.match(html, new RegExp(bodyClass)); assert.ok(html.includes(uniqueLabel), `${file} deve ser identificada visualmente`); }
const css = read('frontend/assets/css/login.css');
for (const className of ['auth-page-login','auth-page-cadastro','auth-page-recovery','auth-page-password']) assert.ok(css.includes(`.${className}`));
assert.match(css, /--auth-accent-rgb/);
console.log('PASS: as quatro telas públicas de autenticação possuem identidade visual e rótulo próprios');
