from flask import Blueprint, jsonify, request

from services.historico_service import HistoricoService


historico_bp = Blueprint(
    "historico",
    __name__,
    url_prefix="/api/historico"
)

historico_service = HistoricoService()


@historico_bp.route("/", methods=["GET"])
def listar():
    return jsonify(historico_service.listar()), 200


@historico_bp.route("/<int:historico_id>", methods=["GET"])
def obter_por_id(historico_id):
    registro = historico_service.obter_por_id(historico_id)

    if registro is None:
        return jsonify({"erro": "Movimentação não encontrada."}), 404

    return jsonify(registro), 200


@historico_bp.route("/", methods=["POST"])
def cadastrar():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie um objeto JSON válido."}), 400

    try:
        registro = historico_service.cadastrar(dados)
        return jsonify(registro), 201
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
