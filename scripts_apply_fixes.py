from pathlib import Path
root = Path('/home/ubuntu/projects/elo-campus-0105c420/work/EloCampus--main')

# Dashboard: restore semantic state colors and improve quick action sizing.
dashboard = root/'frontend/assets/css/dashboard.css'
with dashboard.open('a', encoding='utf-8') as f:
    f.write('''\n\n/* Correções consolidadas — identidade ELO + estados operacionais semânticos. */
.dashboard-distribution .badge-ok { --c: var(--st-ok, #34d399); color: var(--st-ok, #34d399); background: color-mix(in srgb, var(--st-ok, #34d399) 12%, transparent); }
.dashboard-distribution .badge-loan { --c: var(--st-loan, #60a5fa); color: var(--st-loan, #60a5fa); background: color-mix(in srgb, var(--st-loan, #60a5fa) 12%, transparent); }
.dashboard-distribution .badge-late { --c: var(--st-late, #fb7185); color: var(--st-late, #fb7185); background: color-mix(in srgb, var(--st-late, #fb7185) 12%, transparent); }
.dashboard-distribution .badge-maint { --c: var(--st-maint, #fbbf24); color: var(--st-maint, #fbbf24); background: color-mix(in srgb, var(--st-maint, #fbbf24) 12%, transparent); }
.dashboard-distribution .badge-off { --c: var(--st-off, #94a3b8); color: var(--st-off, #94a3b8); background: color-mix(in srgb, var(--st-off, #94a3b8) 12%, transparent); }
.admin-action { min-height: 112px; padding: 1rem 3rem 1rem 1rem; }
.admin-action .self-action-icon { width: 48px; height: 48px; flex-basis: 48px; }
.admin-action .self-action-icon svg { width: 23px; height: 23px; }
.admin-action .self-action-copy strong { font-size: 1rem; }
.admin-action .self-action-copy small { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.4; }
@media (max-width: 760px) {
  .admin-action { min-height: 86px; padding: .85rem 2.7rem .85rem .85rem; }
  .admin-action .self-action-icon { width: 44px; height: 44px; flex-basis: 44px; }
}
''')

# Shared polish: preserve long IDs/profiles and make action buttons distinct.
polish = root/'frontend/assets/css/page-polish.css'
with polish.open('a', encoding='utf-8') as f:
    f.write('''\n\n/* Correções de legibilidade em tabelas e ações de empréstimos. */
.solicitantes-table th:first-child, .solicitantes-table td:first-child { width: 9rem; min-width: 9rem; }
.solicitantes-table .solicitante-code { white-space: nowrap; word-break: normal; overflow-wrap: normal; max-width: none; min-width: 8rem; }
[data-pagina="usuarios"] .table-wrap td:nth-child(3),
[data-pagina="usuarios"] .table-wrap td:nth-child(4) { white-space: nowrap; overflow-wrap: normal; word-break: normal; }
[data-pagina="usuarios"] .table-wrap td:nth-child(2) { overflow-wrap: normal; word-break: normal; }
[data-pagina="usuarios"] .table-wrap td:nth-child(2) a { overflow-wrap: anywhere; }
.loan-actions [data-cobrar], .table-actions [data-dashboard-cobrar] { color: #fecdd3; border-color: rgba(251,113,133,.5); background: rgba(190,24,93,.18); }
.loan-actions [data-cobrar]:hover, .table-actions [data-dashboard-cobrar]:hover { color: #fff1f2; background: rgba(190,24,93,.35); }
.loan-actions [data-devolver], .table-actions a { color: #a7f3d0; border-color: rgba(52,211,153,.42); background: rgba(16,185,129,.12); }
@media (max-width: 390px) {
  .main { width: 100%; max-width: 100%; padding-inline: .8rem; }
  .page-head > .toolbar { gap: .6rem; }
  .page-head > .toolbar > * { min-width: 0; max-width: 100%; }
  .table-wrap { max-width: 100%; }
}
''')

# Read query filter on loans page so dashboard link works.
loans = root/'frontend/assets/js/emprestimos-ui.js'
s = loans.read_text(encoding='utf-8')
s = s.replace('let registros = [], filtro = "ativos", selecionado = null;', 'const filtroInicial = new URLSearchParams(location.search).get("filtro");\n    let registros = [], filtro = ["ativos", "atrasados", "historico"].includes(filtroInicial) ? filtroInicial : "ativos", selecionado = null;')
loans.write_text(s, encoding='utf-8')

# Complete history equipment association when API sends equipment_id directly.
mov = root/'frontend/assets/js/movimentacoes.js'
s = mov.read_text(encoding='utf-8')
s = s.replace('const e = catalogo.get(String(m.equipamento?.id ?? ""));', 'const e = catalogo.get(String(m.equipamento?.id ?? m.equipamento_id ?? m.item_id ?? ""));')
mov.write_text(s, encoding='utf-8')

# Add route manifest required by the web runtime.
manifest = root/'frontend/manus-routes.json'
manifest.write_text('''{"routes":[{"path":"/","title":"Login"},{"path":"/pages/dashboard.html","title":"Painel"},{"path":"/pages/disponiveis.html","title":"Equipamentos disponíveis"},{"path":"/pages/equipamentos.html","title":"Equipamentos"},{"path":"/pages/equipamento-detalhe.html","title":"Detalhes do equipamento"},{"path":"/pages/etiquetas.html","title":"Etiquetas QR Code"},{"path":"/pages/emprestimos.html","title":"Empréstimos"},{"path":"/pages/devolucoes.html","title":"Devoluções"},{"path":"/pages/reservas.html","title":"Reservas"},{"path":"/pages/movimentacoes.html","title":"Histórico de movimentações"},{"path":"/pages/perfil.html","title":"Perfil"}]}\n''', encoding='utf-8')

# Bump frontend version and cache keys consistently.
for p in root.rglob('*'):
    if p.is_file() and p.suffix in {'.html', '.js', '.css', '.md'}:
        try: text = p.read_text(encoding='utf-8')
        except UnicodeDecodeError: continue
        text = text.replace('2026.11.11.4', '2026.11.12.1')
        p.write_text(text, encoding='utf-8')
PY
python3 /home/ubuntu/projects/elo-campus-0105c420/work/EloCampus--main/scripts_apply_fixes.py
rm /home/ubuntu/projects/elo-campus-0105c420/work/EloCampus--main/scripts_apply_fixes.py
