import os
from functools import wraps

from flask import request, jsonify, g
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from database.conexao import Conexao


def _serializer():
    secret = os.getenv("FLASK_SECRET_KEY")
    if not secret:
        raise RuntimeError("FLASK_SECRET_KEY não configurada.")
    return URLSafeTimedSerializer(secret, salt="elocampus-auth")


def gerar_token(usuario_id):
    return _serializer().dumps({"usuario_id": usuario_id})


def requer_autenticacao(f):
    @wraps(f)
    def decorada(*args, **kwargs):
        cabecalho = request.headers.get("Authorization", "")
        esquema, _, token = cabecalho.partition(" ")

        if esquema.lower() != "bearer" or not token:
            return jsonify({"erro": "Autenticação necessária."}), 401

        try:
            dados = _serializer().loads(token, max_age=3600)
        except SignatureExpired:
            return jsonify({"erro": "Token expirado. Faça login novamente."}), 401
        except BadSignature:
            return jsonify({"erro": "Token inválido."}), 401

        usuario_id = dados.get("usuario_id")
        if not isinstance(usuario_id, int):
            return jsonify({"erro": "Token inválido."}), 401

        with Conexao.conectar() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, nome, email, papel, ativo, solicitante_id
                    FROM usuarios
                    WHERE id = %s
                    """,
                    (usuario_id,)
                )
                usuario = cur.fetchone()

        if usuario is None or not usuario[4]:
            return jsonify({"erro": "Usuário inativo ou inexistente."}), 401

        g.usuario = {
            "id": usuario[0],
            "nome": usuario[1],
            "email": usuario[2],
            "papel": usuario[3],
            "solicitante_id": usuario[5]
        }
        return f(*args, **kwargs)

    return decorada


def requer_papeis(*papeis):
    def decorador(f):
        @wraps(f)
        @requer_autenticacao
        def decorada(*args, **kwargs):
            if g.usuario["papel"] not in papeis:
                return jsonify({"erro": "Permissão insuficiente."}), 403
            return f(*args, **kwargs)
        return decorada
    return decorador
