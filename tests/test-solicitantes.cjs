const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');

const page = fs.readFileSync(path.join(root, 'frontend/pages/solicitantes.html'), 'utf8');
const manager = fs.readFileSync(path.join(root, 'frontend/assets/js/solicitantes-manager.js'), 'utf8');
const signup = fs.readFileSync(path.join(root, 'frontend/pages/cadastro.html'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'frontend/assets/js/layout.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'frontend/assets/js/api.js'), 'utf8');
assert.match(page, /id="solicitante-form"/);
assert.match(page, /id="solicitantes-tbody"/);
assert.match(page, /código é o ID|código exibido na lista/i);
assert.match(manager, /ELO\.criarSolicitante/);
assert.match(manager, /ELO\.salvarSolicitante/);
assert.match(manager, /ELO\.desativarSolicitante/);
assert.match(manager, /Informe o código .* à pessoa/);
assert.match(signup, /A equipe precisa cadastrar você primeiro na área “Solicitantes”/);
assert.match(layout, /href: "solicitantes\.html"/);
assert.match(layout, /arquivoAtual === "usuarios\.html" && perfilAtual !== "administrador"/);
assert.equal(fs.existsSync(path.join(root, 'frontend/assets/js/solicitantes-ui.js')), false, 'script de protótipo que adicionava registros locais foi removido');

function makeResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
(async () => {
  const calls = [];
  const context = {
    window: { ELO_API_BASE_URL: 'https://api.example.test/api' },
    location: { pathname: '/pages/solicitantes.html', href: '' },
    obterSessao: () => ({ token: 'token-teste', perfil: 'administrador' }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      const method = options.method;
      if (method === 'GET' && url.endsWith('/solicitantes')) return makeResponse(200, { solicitantes: [{ id: 31, nome: 'Ana Teste', tipo: 'aluno', ativo: true }] });
      if (method === 'POST' && url.endsWith('/solicitantes')) return makeResponse(201, { mensagem: 'Criado', solicitante: { id: 32, nome: 'Maria Teste', tipo: 'professor' } });
      if (method === 'PUT' && url.endsWith('/solicitantes/32')) return makeResponse(200, { mensagem: 'Atualizado', solicitante: { id: 32 } });
      if (method === 'PATCH' && url.endsWith('/solicitantes/32/desativar')) return makeResponse(200, { mensagem: 'Desativado', solicitante: { id: 32, ativo: false } });
      return makeResponse(404, { erro: 'Rota não encontrada' });
    },
    console,
    Set, String, Number, Object, Array, JSON, Date, Math, encodeURIComponent, normalize: undefined,
  };
  vm.createContext(context);
  vm.runInContext(`${apiSource}\n;globalThis.__ELO = ELO;`, context, { filename: 'api.js' });
  const ELO = context.__ELO;
  const lista = await ELO.solicitantes();
  assert.equal(lista.length, 1);
  assert.equal(calls.at(-1).url, 'https://api.example.test/api/solicitantes');
  assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer token-teste');

  await ELO.criarSolicitante({ nome: '  Maria Teste  ', tipo: 'Professor', setor: '  TI ', email: ' MARIA@EXAMPLE.COM ', telefone: '' });
  const criacao = calls.at(-1);
  assert.equal(criacao.options.method, 'POST');
  assert.deepEqual(JSON.parse(criacao.options.body), { nome: 'Maria Teste', tipo: 'professor', setor: 'TI', email: 'maria@example.com', telefone: null });

  await ELO.salvarSolicitante(32, { nome: 'Maria Teste', tipo: 'professor', setor: '', email: '', telefone: '77999990000' });
  assert.equal(calls.at(-1).options.method, 'PUT');
  assert.ok(calls.at(-1).url.endsWith('/solicitantes/32'));

  await ELO.desativarSolicitante(32);
  assert.equal(calls.at(-1).options.method, 'PATCH');
  assert.ok(calls.at(-1).url.endsWith('/solicitantes/32/desativar'));
  console.log('PASS: interface de solicitantes conecta CRUD às rotas documentadas.');
  console.log('PASS: cadastro público explica o pré-requisito e exige o ID correto sem expor lista pública.');
  console.log('PASS: API envia campos normalizados, token Bearer e métodos POST/PUT/PATCH corretos.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
