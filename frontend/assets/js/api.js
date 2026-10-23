/* ELO Campus — camada de dados para API real e modo demonstração. */
"use strict";
const API_BASE_URL=String(window.ELO_API_BASE_URL||"").replace(/\/+$/,"");
const MODO_DADOS=String(window.ELO_DATA_MODE||"api").toLowerCase()==="api"?"api":"demo";
const estadoFrontend=v=>({novo:"Novo",bom:"Bom",regular:"Regular",danificado:"Danificado"}[String(v||"").toLowerCase()]||v||"");
const estadoApi=v=>String(v||"bom").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const normalizarEquipamento=e=>({...e,patrimonio:e.numero_patrimonio??e.patrimonio??"",categoria:e.categoria??"",condicao:estadoFrontend(e.estado_conservacao??e.condicao),situacao:e.situacao||({disponivel:"disponivel",emprestado:"emprestado",manutencao:"manutencao",baixado:"inativo"}[e.status]||"disponivel"),base:e.status==="baixado"?"inativo":e.status,localizacao:e.localizacao||""});
const normalizarEmprestimo=l=>{const item=(l.itens||[])[0]||{};return {...l,emprestimoId:l.id,equipamento:{id:item.equipamento_id??l.equipamento_id,nome:item.equipamento||l.equipamento||"Equipamento",patrimonio:item.numero_patrimonio||l.numero_patrimonio||"",categoria:item.categoria||"",setor:item.setor||"",condicao:estadoFrontend(item.estado_na_retirada)},solicitante:{id:l.solicitante_id,nome:l.solicitante||"—",vinculo:"",matricula:""},retirada:l.data_emprestimo,prevista:l.data_prevista_devolucao,devolvida:item.data_devolucao||(l.status==="concluido"?l.data_devolucao:null),registradoPor:l.usuario_responsavel||"—",observacoes:l.observacoes||"",situacao:(l.status==="concluido"||item.data_devolucao)?"devolvido":(l.status==="cancelado"?"cancelado":(new Date(l.data_prevista_devolucao)<new Date()?"atrasado":"emprestado")),itens:l.itens||[]};};
async function requisitar(caminho,opcoes={}){
 const sessao=typeof obterSessao==="function"?obterSessao():null,headers={Accept:"application/json"};
 if(opcoes.corpo!==undefined&&opcoes.corpo!==null)headers["Content-Type"]="application/json";
 if(sessao?.token)headers.Authorization=`Bearer ${sessao.token}`;
 let resposta;try{resposta=await fetch(`${API_BASE_URL}${caminho}`,{method:opcoes.metodo||"GET",headers,body:opcoes.corpo==null?undefined:JSON.stringify(opcoes.corpo)});}catch{throw new Error("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");}
 const corpo=await resposta.json().catch(()=>null);
 if(!resposta.ok){const msg=resposta.status===500?"Ocorreu um erro interno. Tente novamente em instantes.":(corpo?.erro||corpo?.mensagem||(resposta.status===401?"Sua sessão expirou. Entre novamente.":"Não foi possível concluir a solicitação."));if(resposta.status===401&&!opcoes.naoRedirecionar401){try{sessionStorage.removeItem("elo.sessao");localStorage.removeItem("elo.sessao");}catch{}if(!/\/(index\.html)?$/.test(location.pathname))location.href="../index.html?sessao=expirada";}const e=new Error(msg);e.status=resposta.status;e.campo=corpo?.campo;throw e;}
 return corpo;
}
async function origem(demo,caminho,opcoes){if(MODO_DADOS==="demo"){await new Promise(r=>setTimeout(r,25));return demo();}return requisitar(caminho,opcoes);}
const ELO={
 modo:()=>MODO_DADOS,
 resumoDashboard:()=>origem(demoResumo,"/dashboard/resumo"),
 equipamentos:async()=>MODO_DADOS==="demo"?demoEquipamentos():(await requisitar("/equipamentos")).equipamentos.map(normalizarEquipamento),
 equipamento:async id=>MODO_DADOS==="demo"?demoEquipamento(id):normalizarEquipamento((await requisitar(`/equipamentos/${encodeURIComponent(id)}`)).equipamento),
 consultaQr:async codigo=>MODO_DADOS==="demo"?demoConsultaQr(codigo):requisitar(`/consulta-qr/${encodeURIComponent(codigo)}`),
 perfil:async()=>MODO_DADOS==="demo"?(obterSessao()||{}):(obterSessao()?.usuario||obterSessao()||{}),
 salvarPerfil:async dados=>{if(MODO_DADOS==="demo")return dados;throw new Error("A API ainda não disponibiliza edição de perfil.");},
 emprestimos:async()=>MODO_DADOS==="demo"?demoEmprestimos():(await requisitar("/emprestimos")).emprestimos.map(normalizarEmprestimo),
 movimentacoes:async()=>MODO_DADOS==="demo"?demoMovimentacoes():(await requisitar("/historico")).map(m=>({id:m.id,quando:m.data_movimentacao,tipo:m.tipo_movimentacao,classe:m.tipo_movimentacao,equipamento:{id:m.equipamento_id,nome:m.equipamento_nome,patrimonio:"",categoria:""},detalhe:m.descricao,por:m.usuario_nome,emprestimoId:m.emprestimo_id})),
 registrarEmprestimo:async d=>{if(MODO_DADOS==="demo")return demoRegistrarEmprestimo(d);const s=obterSessao()||{};let sid=d.solicitante_id??s.solicitante_id;
 if(!sid && d.solicitante){const lista=(await requisitar("/solicitantes")).solicitantes||[];const alvo=lista.find(x=>String(x.nome||"").trim().toLocaleLowerCase("pt-BR")===String(d.solicitante).trim().toLocaleLowerCase("pt-BR"));sid=alvo?.id;}
 if(!sid)throw new Error("Não foi possível identificar o cadastro do solicitante. Confira se ele está cadastrado e ativo.");
 return requisitar("/emprestimos",{metodo:"POST",corpo:{solicitante_id:Number(sid),equipamentos:(d.equipamentos||[]).map(Number),data_prevista_devolucao:new Date(d.prevista).toISOString(),observacoes:[d.finalidade,d.observacoes].filter(Boolean).join(" — ")||null}});},
 registrarDevolucao:async d=>{if(MODO_DADOS==="demo")return demoRegistrarDevolucao(d);const lista=(await requisitar("/emprestimos")).emprestimos||[],ids=new Set((d.itens||[]).map(String)),alvos=lista.filter(l=>ids.has(String(l.id))||ids.has(String(l.equipamento_id)));if(!alvos.length)throw new Error("Não foi possível relacionar os itens selecionados aos empréstimos. Atualize a página.");let feitos=0;for(const l of alvos){const det=(await requisitar(`/emprestimos/${encodeURIComponent(l.id)}`)).emprestimo;for(const it of det.itens||[]){if((ids.has(String(it.equipamento_id))||ids.has(String(l.id)))&&!it.data_devolucao){await requisitar(`/emprestimos/${encodeURIComponent(l.id)}/itens/${encodeURIComponent(it.equipamento_id)}/devolver`,{metodo:"PATCH",corpo:{estado_na_devolucao:estadoApi(d.condicao||"bom"),observacoes:[d.observacoes,d.acessoriosConferidos?"Acessórios conferidos":"",d.equipamentoConferido?"Equipamento conferido":"",d.assinaturaRecebida?"Assinatura recebida":""].filter(Boolean).join("; ")||null}});feitos++;}}}if(!feitos)throw new Error("Nenhum item pendente de devolução foi encontrado.");return {itens:feitos};},
 removerEquipamento:async id=>MODO_DADOS==="demo"?demoRemoverEquipamento(id):requisitar(`/equipamentos/${encodeURIComponent(id)}/inativar`,{metodo:"PATCH"}),
 salvarEquipamento:async(d,id)=>{if(MODO_DADOS==="demo")return demoSalvarEquipamento(d,id);const cats=(await requisitar("/categorias")).categorias||[],cat=cats.find(c=>String(c.id)===String(d.categoria_id)||String(c.nome).toLowerCase()===String(d.categoria||"").toLowerCase());if(!cat)throw new Error("Selecione uma categoria cadastrada e ativa. A API exige categoria_id.");const corpo={nome:d.nome,categoria_id:Number(cat.id),numero_patrimonio:d.patrimonio||d.numero_patrimonio,setor:d.setor,localizacao:d.localizacao||"",estado_conservacao:estadoApi(d.condicao||d.estado_conservacao),qr_code:d.qr_code||d.patrimonio||d.numero_patrimonio,observacoes:d.observacoes||null,elegibilidade:d.elegibilidade||"todos"};return (await requisitar(id?`/equipamentos/${encodeURIComponent(id)}`:"/equipamentos",{metodo:id?"PUT":"POST",corpo})).equipamento;},
 categorias:async()=>MODO_DADOS==="demo"?[]:(await requisitar("/categorias")).categorias,
 solicitantes:async()=>MODO_DADOS==="demo"?[]:(await requisitar("/solicitantes")).solicitantes,
 reservas:async()=>MODO_DADOS==="demo"?[]:(await requisitar("/reservas")).reservas,
 criarReserva:d=>requisitar("/reservas",{metodo:"POST",corpo:d}),
 aprovarReserva:id=>requisitar(`/reservas/${encodeURIComponent(id)}/aprovar`,{metodo:"PATCH"}),
 rejeitarReserva:id=>requisitar(`/reservas/${encodeURIComponent(id)}/rejeitar`,{metodo:"PATCH"}),
 cancelarReserva:id=>requisitar(`/reservas/${encodeURIComponent(id)}/cancelar`,{metodo:"PATCH"}),
 manutencoes:async()=>MODO_DADOS==="demo"?[]:(await requisitar("/manutencoes")).manutencoes,
 abrirManutencao:d=>requisitar("/manutencoes",{metodo:"POST",corpo:d}),
 finalizarManutencao:(id,d)=>requisitar(`/manutencoes/${encodeURIComponent(id)}/finalizar`,{metodo:"PATCH",corpo:d}),
 usuarios:async()=>MODO_DADOS==="demo"?[]:(await requisitar("/usuarios")).usuarios,
 criarUsuario:d=>requisitar("/usuarios",{metodo:"POST",corpo:d}),
 desativarUsuario:id=>requisitar(`/usuarios/${encodeURIComponent(id)}/desativar`,{metodo:"PATCH"})
};
