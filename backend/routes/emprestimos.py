
from flask import Blueprint, jsonify, request, g

from services.emprestimo_service import EmprestimoService
from services.auth_token import requer_autenticacao, requer_papeis


emprestimos_bp = Blueprint(
    "emprestimos",
    __name__,
    url_prefix="/api/emprestimos"
)

emprestimo_service = EmprestimoService()


@emprestimos_bp.route("/", methods=["GET"])
@requer_autenticacao
def listar_emprestimos():
    usuario = g.usuario

    if usuario["papel"] == "aluno":
        solicitante_id = usuario["solicitante_id"]

        if solicitante_id is None:
            return jsonify({
                "erro": "Sua conta não está vinculada a um solicitante."
            }), 403

        emprestimos = emprestimo_service.listar_por_solicitante(
            solicitante_id
        )
    else:
        emprestimos = emprestimo_service.listar()

    return jsonify({"emprestimos": emprestimos}), 200


@emprestimos_bp.route("/<int:emprestimo_id>", methods=["GET"])
@requer_autenticacao
def obter_emprestimo(emprestimo_id):
    emprestimo = emprestimo_service.obter_por_id(emprestimo_id)

    if emprestimo is None:
        return jsonify({
            "erro": "Empréstimo não encontrado."
        }), 404

    usuario = g.usuario

    if (
        usuario["papel"] == "aluno"
        and emprestimo["solicitante_id"] != usuario["solicitante_id"]
    ):
        return jsonify({
            "erro": "Permissão insuficiente."
        }), 403

    return jsonify({"emprestimo": emprestimo}), 200


@emprestimos_bp.route("/", methods=["POST"])
@requer_autenticacao
def cadastrar_emprestimo():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    usuario = g.usuario

    if usuario["papel"] == "aluno":
        solicitante_id = usuario["solicitante_id"]

        if solicitante_id is None:
            return jsonify({
                "erro": "Sua conta não está vinculada a um solicitante."
            }), 403

        # A identidade vem do token, nunca do corpo enviado pelo cliente.
        dados["solicitante_id"] = solicitante_id
        dados["usuario_responsavel_id"] = usuario["id"]

    try:
        emprestimo = emprestimo_service.cadastrar(dados)

        return jsonify({
            "mensagem": "Empréstimo cadastrado com sucesso.",
            "emprestimo": emprestimo
        }), 201

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@emprestimos_bp.route(
    "/<int:emprestimo_id>/itens/<int:equipamento_id>/devolver",
    methods=["PATCH"]
)
@requer_papeis("admin", "operador")
def devolver_equipamento(emprestimo_id, equipamento_id):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    # O responsável pela devolução é identificado pelo token autenticado.
    usuario_id = g.usuario["id"]

    try:
        emprestimo = emprestimo_service.devolver_equipamento(
            emprestimo_id=emprestimo_id,
            equipamento_id=equipamento_id,
            estado_na_devolucao=dados.get("estado_na_devolucao"),
            usuario_id=usuario_id,
            observacoes=dados.get("observacoes")
        )

        return jsonify({
            "mensagem": "Devolução registrada com sucesso.",
            "emprestimo": emprestimo
        }), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
