from flask import Blueprint, jsonify, request

from services.auth_service import AuthService
from services.auth_token import gerar_token

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


@auth_bp.route("/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        usuario = AuthService.login(dados)
        return jsonify({
    "mensagem": "Login realizado com sucesso.",
    "token": gerar_token(usuario["id"]),
    "usuario": usuario
}), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 401


@auth_bp.route("/cadastro-aluno", methods=["POST"])
def cadastrar_aluno():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados em formato JSON."
        }), 400

    try:
        usuario = AuthService.cadastrar_aluno(dados)
        return jsonify({
            "mensagem": "Conta de aluno criada com sucesso.",
            "usuario": usuario
        }), 201

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
