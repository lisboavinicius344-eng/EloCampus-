from flask import Blueprint, jsonify, request

from services.manutencao_service import ManutencaoService


manutencoes_bp = Blueprint(
    "manutencoes",
    __name__,
    url_prefix="/api/manutencoes"
)

manutencao_service = ManutencaoService()


@manutencoes_bp.route("/", methods=["GET"])
def listar_manutencoes():
    return jsonify({
        "manutencoes": manutencao_service.listar()
    }), 200


@manutencoes_bp.route("/<int:manutencao_id>", methods=["GET"])
def obter_manutencao(manutencao_id):
    manutencao = manutencao_service.obter_por_id(manutencao_id)

    if manutencao is None:
        return jsonify({
            "erro": "Manutenção não encontrada."
        }), 404

    return jsonify({
        "manutencao": manutencao
    }), 200


@manutencoes_bp.route("/", methods=["POST"])
def cadastrar_manutencao():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        manutencao = manutencao_service.cadastrar(dados)

        return jsonify({
            "mensagem": "Manutenção cadastrada com sucesso.",
            "manutencao": manutencao
        }), 201

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@manutencoes_bp.route(
    "/<int:manutencao_id>/finalizar",
    methods=["PATCH"]
)
def finalizar_manutencao(manutencao_id):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        manutencao = manutencao_service.finalizar(
            manutencao_id,
            dados
        )

        if manutencao is None:
            return jsonify({
                "erro": "Manutenção não encontrada."
            }), 404

        return jsonify({
            "mensagem": "Manutenção finalizada com sucesso.",
            "manutencao": manutencao
        }), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
