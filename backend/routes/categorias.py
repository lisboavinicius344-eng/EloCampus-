from flask import Blueprint, jsonify, request
from services.categoria_service import CategoriaService
from services.auth_token import requer_autenticacao, requer_papeis

categorias_bp = Blueprint(
    "categorias",
    __name__,
    url_prefix="/api/categorias"
)

categoria_service = CategoriaService()


@categorias_bp.route("/", methods=["GET"])
@requer_autenticacao
def listar_categorias():
    return jsonify({
        "categorias": categoria_service.listar()
    }), 200


@categorias_bp.route("/<int:categoria_id>", methods=["GET"])
@requer_autenticacao
def obter_categoria(categoria_id):
    categoria = categoria_service.obter_por_id(categoria_id)

    if categoria is None:
        return jsonify({
            "erro": "Categoria não encontrada."
        }), 404

    return jsonify({"categoria": categoria}), 200


@categorias_bp.route("/", methods=["POST"])
@requer_papeis("admin", "operador")
def cadastrar_categoria():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        categoria = categoria_service.cadastrar(dados)

        return jsonify({
            "mensagem": "Categoria cadastrada com sucesso.",
            "categoria": categoria
        }), 201

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@categorias_bp.route("/<int:categoria_id>", methods=["PUT"])
@requer_papeis("admin", "operador")
def atualizar_categoria(categoria_id):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        categoria = categoria_service.atualizar(
            categoria_id, dados
        )

        if categoria is None:
            return jsonify({
                "erro": "Categoria não encontrada."
            }), 404

        return jsonify({
            "mensagem": "Categoria atualizada com sucesso.",
            "categoria": categoria
        }), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


@categorias_bp.route(
    "/<int:categoria_id>/desativar",
    methods=["PATCH"]
)
@requer_papeis("admin", "operador")
def desativar_categoria(categoria_id):
    try:
        categoria = categoria_service.desativar(categoria_id)

        if categoria is None:
            return jsonify({
                "erro": "Categoria não encontrada."
            }), 404

        return jsonify({
            "mensagem": "Categoria desativada com sucesso.",
            "categoria": categoria
        }), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400