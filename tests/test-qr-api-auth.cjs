const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/api.js'), 'utf8');
async function makeContext(fetchImpl, initialSession) {
  let session = initialSession;
  const ctx = {
    window: { ELO_API_BASE_URL: 'https://api.example.test/api', ELO_DATA_MODE: 'api' },
    location: { pathname: '/pages/consulta-qr-interno.html', href: '' },
    sessionStorage: { removeItem() {} }, localStorage: { removeItem() {} },
    obterSessao: () => session, limparSessao: () => { session = null; },
    fetch: fetchImpl, URL, Date, Map, Set, String, Boolean, Object, Array, JSON, Error, Promise, encodeURIComponent,
  };
  vm.createContext(ctx); vm.runInContext(source, ctx, { filename: 'api.js' });
  return ctx;
}
(async () => {
  const requests = [];
  const ctx = await makeContext(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ equipamento: { id: 3, nome: 'Notebook' }, emprestimo: { id: 22, solicitante: 'Detalhe protegido' } }) };
  }, { token: 'TOKEN-DA-EQUIPE', perfil: 'administrador' });
  const equipeData = await vm.runInContext('ELO.consultaQr("NB-0003")', ctx);
  assert.equal(requests[0].url, 'https://api.example.test/api/consulta-qr/NB-0003');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer TOKEN-DA-EQUIPE');
  assert.equal(equipeData.emprestimo.solicitante, 'Detalhe protegido');

  let count = 0; const expiredRequests = [];
  const expired = await makeContext(async (url, options) => {
    expiredRequests.push({ url, options }); count++;
    if (count === 1) return { ok: false, status: 401, json: async () => ({ erro: 'Token expirado' }) };
    return { ok: true, status: 200, json: async () => ({ equipamento: { id: 3, nome: 'Notebook', situacao: 'emprestado' }, emprestimo: null }) };
  }, { token: 'TOKEN-EXPIRADO', perfil: 'administrador' });
  const publicData = await vm.runInContext('ELO.consultaQr("NB-0003")', expired);
  assert.equal(expiredRequests.length, 2);
  assert.equal(expiredRequests[1].options.headers.Authorization, undefined, 'fallback deve ser público depois de descartar a sessão expirada');
  assert.equal(publicData.equipamento.nome, 'Notebook');
  console.log('PASS: consulta QR autenticada envia o Bearer token e pode receber empréstimo atual para a equipe');
  console.log('PASS: sessão expirada é descartada e a consulta QR pública continua funcionando sem divulgar empréstimo');
})().catch(error => { console.error(error); process.exitCode = 1; });
