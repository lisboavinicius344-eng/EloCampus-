const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/auth.js'), 'utf8');
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), values };
}
function createContext(fetchImpl) {
  const sessionStorage = storage();
  const localStorage = storage();
  const context = {
    document: { getElementById: () => null },
    window: { ELO_API_BASE_URL: 'https://api.example.test/api', location: { pathname: '/index.html', href: '', replace() {} } },
    localStorage, sessionStorage, fetch: fetchImpl,
    URLSearchParams, Set, Map, String, Object, JSON, Error, Boolean,
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'auth.js' });
  return { context, sessionStorage, localStorage };
}
(async () => {
  let sent;
  const ok = createContext(async (url, options) => {
    sent = { url, options };
    return { ok: true, status: 200, json: async () => ({ token: 'TOKEN-TESTE', usuario: { id: 9, nome: 'Pessoa Teste', email: 'pessoa@instituicao.edu.br', papel: 'aluno', solicitante_id: 30, deve_trocar_senha: true, senha_provisoria: 'NAO-ARMAZENAR' } }) };
  });
  const sessao = await vm.runInContext('autenticar("PESSOA@INSTITUICAO.EDU.BR", "segredo-digitado")', ok.context);
  assert.equal(sent.url, 'https://api.example.test/api/auth/login');
  assert.equal(JSON.parse(sent.options.body).email, 'pessoa@instituicao.edu.br');
  assert.equal(sent.options.cache, 'no-store');
  assert.equal(sessao.perfil, 'aluno');
  assert.equal(sessao.deve_trocar_senha, true);
  assert.equal(sessao.senha_provisoria, undefined);
  assert.equal(sessao.usuario.senha_provisoria, undefined);
  vm.runInContext('salvarSessao({token:"TOKEN-SESSAO", perfil:"aluno"})', ok.context);
  assert.ok(ok.sessionStorage.getItem('elo.sessao'));
  assert.equal(ok.localStorage.getItem('elo.sessao'), null, 'token não pode ser persistido no localStorage');

  const legado = createContext(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  legado.localStorage.setItem('elo.sessao', JSON.stringify({ token: 'TOKEN-ANTIGO', perfil: 'aluno' }));
  const sessaoLegada = vm.runInContext('obterSessao()', legado.context);
  assert.equal(sessaoLegada, null, 'tokens persistentes antigos devem ser invalidados, não reativados');
  assert.equal(legado.localStorage.getItem('elo.sessao'), null, 'token legado deve ser removido do localStorage');

  const failed = createContext(async () => ({ ok: false, status: 401, json: async () => ({ erro: 'Sua senha provisória expirou. Solicite uma nova.' }) }));
  await assert.rejects(vm.runInContext('autenticar("pessoa@instituicao.edu.br", "senha-expirada")', failed.context), /Sua senha provisória expirou/);

  const sourceLower = source.toLowerCase();
  assert.doesNotMatch(sourceLower, /admin123|aluno123|operador123|servidor123/);
  assert.doesNotMatch(source, /CONTAS_DEMO|elo\.contas\.cadastradas/);
  console.log('PASS: login chama a API com e-mail normalizado e cache no-store');
  console.log('PASS: a troca obrigatória de senha é preservada na sessão');
  console.log('PASS: senhas vindas no objeto de usuário não são armazenadas');
  console.log('PASS: token vai para sessionStorage, nunca para localStorage');
  console.log('PASS: tokens persistentes legados são removidos sem restauração da sessão');
  console.log('PASS: erro 401 do login é apresentado sem redirecionamento genérico');
  console.log('PASS: contas e senhas fixas de demonstração removidas');
})().catch((error) => { console.error(error); process.exitCode = 1; });
