from flask import Blueprint, jsonify, request
from services.solicitante_service import SolicitanteService
from services.auth_token import requer_autenticacao, requer_papeis

solicitantes_bp = Blueprint(
    "solicitantes",
    __name__,
    url_prefix="/api/solicitantes"
)

solicitante_service = SolicitanteService()


@solicitantes_bp.route("/", methods=["GET"])
@requer_autenticacao
def listar_solicitantes():
    return jsonify({
        "solicitantes": solicitante_service.listar()
    }), 200


@solicitantes_bp.route("/<int:solicitante_id>", methods=["GET"])
@requer_autenticacao
def obter_solicitante(solicitante_id):
    solicitante = solicitante_service.obter_por_id(solicitante_id)

    if solicitante is None:
        return jsonify({"erro": "Solicitante não encontrado."}), 404

    return jsonify({"solicitante": solicitante}), 200


@solicitantes_bp.route("/", methods=["POST"])
@requer_papeis("admin", "operador")
def cadastrar_solicitante():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados em formato JSON."}), 400

    try:
        solicitante = solicitante_service.cadastrar(dados)
        return jsonify({
            "mensagem": "Solicitante cadastrado com sucesso.",
            "solicitante": solicitante
        }), 201
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@solicitantes_bp.route("/<int:solicitante_id>", methods=["PUT"])
@requer_papeis("admin", "operador")
def atualizar_solicitante(solicitante_id):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados em formato JSON."}), 400

    try:
        solicitante = solicitante_service.atualizar(solicitante_id, dados)

        if solicitante is None:
            return jsonify({"erro": "Solicitante não encontrado."}), 404

        return jsonify({
            "mensagem": "Solicitante atualizado com sucesso.",
            "solicitante": solicitante
        }), 200
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@solicitantes_bp.route("/<int:solicitante_id>/desativar", methods=["PATCH"])
@requer_papeis("admin", "operador")
def desativar_solicitante(solicitante_id):
    solicitante = solicitante_service.desativar(solicitante_id)

    if solicitante is None:
        return jsonify({
            "erro": "Solicitante não encontrado ou já desativado."
        }), 404

    return jsonify({
        "mensagem": "Solicitante desativado com sucesso.",
        "solicitante": solicitante
    }), 200