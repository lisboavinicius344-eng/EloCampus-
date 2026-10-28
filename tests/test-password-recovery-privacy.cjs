const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

async function apiContext(fetchImpl) {
  const ctx = {
    window: { ELO_API_BASE_URL: 'https://api.example.test/api', ELO_DATA_MODE: 'api' },
    location: { pathname: '/pages/recuperar-senha.html', href: '' },
    sessionStorage: { removeItem() {} }, localStorage: { removeItem() {} },
    obterSessao: () => null, fetch: fetchImpl,
    URL, Date, Map, Set, String, Boolean, Object, Array, JSON, Error, Promise, encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(read('frontend/assets/js/api.js'), ctx, { filename: 'api.js' });
  return ctx;
}

(async () => {
  const loginHtml = read('frontend/index.html');
  const authJs = read('frontend/assets/js/auth.js');
  const adminHtml = read('frontend/pages/usuarios.html');
  const adminJs = read('frontend/assets/js/usuarios-equipe.js');
  const recoveryHtml = read('frontend/pages/recuperar-senha.html');
  const recoveryJs = read('frontend/assets/js/recuperar-senha.js');
  const runtime = read('frontend/assets/js/runtime-config.js');
  const nginx = read('docker/nginx.conf');
  const privacyHtml = read('frontend/pages/privacidade.html');

  assert.match(loginHtml, /pages\/recuperar-senha\.html/);
  assert.match(recoveryHtml, /id="email-recuperacao"/);
  assert.match(recoveryJs, /ELO\.solicitarRecuperacaoSenha/);
  assert.match(recoveryJs, /Se houver uma conta ativa associada/);
  assert.doesNotMatch(recoveryJs, /informar\(erro\.message/);
  assert.match(loginHtml, /pages\/privacidade\.html/);
  assert.match(privacyHtml, /Versão preliminar para validação institucional/);
  assert.match(privacyHtml, /Controlador:/);
  assert.match(authJs, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.doesNotMatch(authJs, /localStorage\.setItem\(SESSION_KEY/);
  assert.doesNotMatch(authJs, /CONTAS_DEMO|admin123|aluno123/);
  assert.match(loginHtml, /Lembrar meu e-mail neste dispositivo/);
  assert.doesNotMatch(adminHtml + adminJs, /senha provisória \(mostrada uma única vez\)|senha_provisoria/);
  assert.match(adminHtml, /nenhuma senha é exibida/i);
  assert.match(runtime, /window\.ELO_DATA_MODE = "api"/);
  assert.ok(!fs.existsSync(path.join(root, 'frontend/assets/js/dados-demo.js')), 'dados de demonstração não devem ser publicados no frontend');
  assert.match(nginx, /X-Content-Type-Options/);
  assert.match(nginx, /Referrer-Policy/);

  let request;
  const ctx = await apiContext(async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ mensagem: 'genérica', email_enviado: true, senha_provisoria: 'SEGREDO-QUE-NAO-PODE-VOLTAR', nested: { password: 'NAO', senhaProvisoria: 'NAO-TAMBEM', tokenRecuperacao: 'NAO-TOKEN' }, senhaProvisoria: 'SEGREDO-CAMEL' }) };
  });
  const resultado = await vm.runInContext('ELO.solicitarRecuperacaoSenha(" pessoa@instituicao.edu.br ")', ctx);
  assert.equal(request.url, 'https://api.example.test/api/auth/esqueci-senha');
  assert.equal(JSON.parse(request.options.body).email, 'pessoa@instituicao.edu.br');
  assert.equal(request.options.headers.Authorization, undefined, 'recuperação é pública e não deve enviar token');
  assert.equal(resultado.senha_provisoria, undefined);
  assert.equal(resultado.nested.password, undefined);
  assert.equal(resultado.nested.senhaProvisoria, undefined);
  assert.equal(resultado.nested.tokenRecuperacao, undefined);
  assert.equal(resultado.senhaProvisoria, undefined);

  const ctx404 = await apiContext(async () => ({ ok: false, status: 404, json: async () => ({ erro: 'Not found' }) }));
  await assert.rejects(vm.runInContext('ELO.solicitarRecuperacaoSenha("pessoa@instituicao.edu.br")', ctx404), /não está habilitada no servidor/i);

  const usersSource = read('frontend/assets/js/usuarios-equipe.js');
  assert.doesNotMatch(usersSource, /senha_provisoria|password/);
  const demoFiles = fs.readdirSync(path.join(root, 'tests', 'fixtures'));
  assert.ok(demoFiles.includes('dados-demo.js'), 'fixture de teste pode existir fora da pasta servida');
  console.log('PASS: página de recuperação existe e usa chamada pública com resposta genérica');
  console.log('PASS: senha e password são removidas das respostas antes de chegar às telas');
  console.log('PASS: UI de equipe não renderiza senha provisória');
  console.log('PASS: tokens não são persistidos e o frontend publicado não contém base de demonstração');
  console.log('PASS: headers de segurança aplicados no Nginx e aviso de privacidade vinculado às telas públicas');
  console.log('PASS: recuperação informa claramente quando o endpoint não existe');
})().catch((error) => { console.error(error); process.exitCode = 1; });
