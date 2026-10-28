const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const layout = read('frontend/assets/js/layout.js');
const dashboardHtml = read('frontend/pages/dashboard.html');
const dashboardJs = read('frontend/assets/js/dashboard.js');
const availableHtml = read('frontend/pages/disponiveis.html');
const availableJs = read('frontend/assets/js/disponiveis.js');
const loanHtml = read('frontend/pages/novo-emprestimo.html');
const loanJs = read('frontend/assets/js/reservas.js');
const loanListJs = read('frontend/assets/js/emprestimos-ui.js');
const userCss = read('frontend/assets/css/dashboard.css');
const availableCss = read('frontend/assets/css/disponiveis.css');

assert.match(layout, /const NAV_USUARIO = \[/);
const navUser = layout.split('const NAV_USUARIO = [')[1].split('];')[0];
assert.match(navUser, /Ver os equipamentos/);
assert.match(navUser, /Consultar QR Code/);
assert.match(navUser, /consulta-qr-interno\.html/);
assert.match(navUser, /Reservar equipamento/);
assert.match(navUser, /Minhas reservas/);
assert.match(navUser, /minhas-reservas\.html/);
assert.match(navUser, /Devolver equipamentos/);
assert.match(navUser, /Meus empréstimos/);
assert.doesNotMatch(navUser, /relatorio\.html|movimentacoes\.html|usuarios\.html|servidor\.html|equipamento-form\.html/);
assert.match(layout, /equipamentos\.html", "equipamento-detalhe\.html/);
assert.match(layout, /const paginasUsuario = \[.*consulta-qr-interno\.html/s);
assert.match(layout, /disponiveis\.html/);

for (const href of ['disponiveis.html', 'novo-emprestimo.html', 'devolucoes.html', 'consulta-qr-interno.html']) {
  assert.ok(dashboardHtml.includes(`href="${href}"`), `home do usuário deve ter link para ${href}`);
}
assert.match(dashboardHtml, /id="inicio-usuario"[\s\S]*?id="itens-comigo"/);
assert.match(dashboardJs, /renderInicioUsuario/);
assert.match(dashboardJs, /ELO\.equipamentos\(\), ELO\.emprestimos\(\)/);
assert.match(dashboardJs, /quantidade-disponivel/);
assert.match(userCss, /prefers-reduced-motion/);

assert.match(availableHtml, /Ver os equipamentos/);
assert.match(availableHtml, /id="busca-disponivel"/);
assert.match(availableJs, /filter\(\(item\) => item\.situacao === "disponivel"\)/);
assert.match(availableJs, /novo-emprestimo\.html\?equipamentoId=/);
assert.match(availableJs, /Tente outro nome ou tipo de equipamento/);
assert.match(availableCss, /grid-template-columns/);
assert.match(availableCss, /max-width: 680px/);
assert.match(userCss, /self-action-qr/);
assert.match(dashboardHtml, /Consultar QR Code/);

assert.match(loanHtml, /id="form-reserva"/);
assert.doesNotMatch(loanHtml, /id="solicitante"/);
assert.match(loanJs, /get\("equipamentoId"\)/);
assert.match(loanJs, /ELO\.criarReserva/);
assert.match(loanJs, /toISOString\(\)/);
assert.match(loanJs, /ELO\.retirarReserva/);
assert.match(loanListJs, /const rotulos = usuarioFinal \? \{ ativos: "Comigo", atrasados: "Atrasados", historico: "Devolvidos" \}/);
assert.match(loanListJs, /aside\.card\[aria-label="Detalhe do empréstimo"\]/);
assert.match(loanListJs, /dados|Meus empréstimos/);
console.log('PASS: autoatendimento tem menu próprio, catálogo só com itens disponíveis, pedido pré-preenchido e listagens simplificadas.');
