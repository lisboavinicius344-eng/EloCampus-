from flask import Blueprint, jsonify, request
from services.equipamento_service import EquipamentoService
from services.auth_token import requer_autenticacao, requer_papeis

equipamentos_bp = Blueprint(
    "equipamentos",
    __name__,
    url_prefix="/api/equipamentos"
)

equipamento_service = EquipamentoService()


@equipamentos_bp.route("/", methods=["GET"])
@requer_autenticacao
def listar_equipamentos():
    return jsonify({
        "equipamentos": equipamento_service.listar()
    }), 200


@equipamentos_bp.route("/", methods=["POST"])
@requer_papeis("admin", "operador")
def cadastrar_equipamento():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        equipamento = equipamento_service.cadastrar(dados)
        return jsonify({
            "mensagem": "Equipamento cadastrado com sucesso.",
            "equipamento": equipamento
        }), 201
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@equipamentos_bp.route("/<int:equipamento_id>", methods=["GET"])
@requer_autenticacao
def obter_equipamento(equipamento_id):
    equipamento = equipamento_service.obter_por_id(equipamento_id)

    if equipamento is None:
        return jsonify({
            "erro": "Equipamento não encontrado."
        }), 404

    return jsonify({"equipamento": equipamento}), 200


@equipamentos_bp.route("/<int:equipamento_id>", methods=["PUT"])
@requer_papeis("admin", "operador")
def atualizar_equipamento(equipamento_id):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        equipamento = equipamento_service.atualizar(
            equipamento_id, dados
        )

        if equipamento is None:
            return jsonify({
                "erro": "Equipamento não encontrado."
            }), 404

        return jsonify({
            "mensagem": "Equipamento atualizado com sucesso.",
            "equipamento": equipamento
        }), 200
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@equipamentos_bp.route(
    "/<int:equipamento_id>/inativar",
    methods=["PATCH"]
)
@requer_papeis("admin", "operador")
def inativar_equipamento(equipamento_id):
    try:
        equipamento = equipamento_service.inativar(equipamento_id)

        if equipamento is None:
            return jsonify({
                "erro": "Equipamento não encontrado."
            }), 404

        return jsonify({
            "mensagem": "Equipamento baixado com sucesso.",
            "equipamento": equipamento
        }), 200
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
