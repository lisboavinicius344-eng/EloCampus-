/* Smoke tests without external dependencies: node tests/api-contract-smoke.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const requests = [];
const loan = {
  id: 41,
  status: 'em_andamento',
  solicitante_id: 7,
  solicitante: 'Ana Silva',
  data_emprestimo: '2026-10-28T09:00:00-03:00',
  data_prevista_devolucao: '2026-10-30T18:00:00-03:00',
  itens: [
    { equipamento_id: 101, equipamento: 'Projetor', numero_patrimonio: 'PRJ-001', categoria: 'Audiovisual' },
    { equipamento_id: 102, equipamento: 'Notebook', numero_patrimonio: 'NTB-002', categoria: 'Informática' },
  ],
};

const context = {
  window: { ELO_API_BASE_URL: 'https://example.test/api' },
  location: { pathname: '/pages/teste.html', href: '' },
  sessionStorage: { removeItem() {} },
  localStorage: { removeItem() {} },
  testSession: null,
  fetch: async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/emprestimos') && (!options.method || options.method === 'GET')) {
      return { ok: true, status: 200, json: async () => ({ emprestimos: [loan] }) };
    }
    if (url.endsWith('/emprestimos/41') && (!options.method || options.method === 'GET')) {
      return { ok: true, status: 200, json: async () => ({ emprestimo: loan }) };
    }
    if (url.endsWith('/emprestimos/41/itens/102/devolver') && options.method === 'PATCH') {
      return { ok: true, status: 200, json: async () => ({ mensagem: 'ok' }) };
    }
    if (url.endsWith('/consulta-qr/CODE-001')) {
      return { ok: true, status: 200, json: async () => ({ equipamento: { id: 1, nome: 'Projetor' } }) };
    }
    throw new Error(`Unexpected test request: ${url}`);
  },
  console,
};

vm.createContext(context);
vm.runInContext('function obterSessao() { return testSession; }', context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/assets/js/api.js'), 'utf8'), context);

(async () => {
  const rows = await vm.runInContext('ELO.emprestimos()', context);
  assert.equal(rows.length, 2, 'a multi-equipment loan becomes two equipment rows');
  assert.deepEqual(Array.from(rows, (row) => row.id), [101, 102], 'row IDs are equipment IDs');
  assert.deepEqual(Array.from(rows, (row) => row.emprestimoId), [41, 41], 'loan ID remains separate');

  requests.length = 0;
  const returned = await vm.runInContext(
    'ELO.registrarDevolucao({ itens: [{ emprestimoId: 41, equipamentoId: 102 }], condicao: "Com avaria" })',
    context,
  );
  assert.equal(returned.itens, 1, 'only the selected item is returned');
  const patches = requests.filter((request) => request.options.method === 'PATCH');
  assert.equal(patches.length, 1, 'one return request is sent');
  assert(patches[0].url.endsWith('/emprestimos/41/itens/102/devolver'));
  assert.equal(JSON.parse(patches[0].options.body).estado_na_devolucao, 'danificado');

  requests.length = 0;
  context.testSession = { token: 'user-token', perfil: 'aluno' };
  await vm.runInContext('ELO.consultaQr("CODE-001")', context);
  assert.equal(requests.at(-1).options.headers.Authorization, undefined, 'regular users use the public QR endpoint without a token');

  requests.length = 0;
  context.testSession = { token: 'staff-token', perfil: 'operador' };
  await vm.runInContext('ELO.consultaQr("CODE-001")', context);
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer staff-token', 'staff can request restricted QR details');

  console.log('ELO Campus API smoke tests: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
