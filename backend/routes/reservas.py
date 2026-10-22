
from flask import Blueprint, jsonify, request, g

from services.reserva_service import ReservaService
from services.auth_token import requer_autenticacao, requer_papeis


reservas_bp = Blueprint(
    "reservas",
    __name__,
    url_prefix="/api/reservas"
)

reserva_service = ReservaService()


@reservas_bp.route("/", methods=["GET"])
@requer_autenticacao
def listar_reservas():
    usuario = g.usuario

    if usuario["papel"] == "aluno":
        solicitante_id = usuario["solicitante_id"]

        if solicitante_id is None:
            return jsonify({
                "erro": "Sua conta não está vinculada a um solicitante."
            }), 403

        reservas = reserva_service.listar_por_solicitante(
            solicitante_id
        )
    else:
        reservas = reserva_service.listar()

    return jsonify({"reservas": reservas}), 200


@reservas_bp.route("/<int:reserva_id>", methods=["GET"])
@requer_autenticacao
def obter_reserva(reserva_id):
    reserva = reserva_service.obter_por_id(reserva_id)

    if reserva is None:
        return jsonify({"erro": "Reserva não encontrada."}), 404

    usuario = g.usuario

    if (
        usuario["papel"] == "aluno"
        and reserva["solicitante_id"] != usuario["solicitante_id"]
    ):
        return jsonify({"erro": "Permissão insuficiente."}), 403

    return jsonify({"reserva": reserva}), 200


@reservas_bp.route("/", methods=["POST"])
@requer_autenticacao
def cadastrar_reserva():
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

        # A identidade do solicitante vem do token autenticado.
        dados["solicitante_id"] = solicitante_id

        # A reserva do aluno não recebe um responsável escolhido pelo cliente.
        dados["usuario_responsavel_id"] = None

    try:
        reserva = reserva_service.cadastrar(dados)

        return jsonify({
            "mensagem": "Reserva cadastrada com sucesso.",
            "reserva": reserva
        }), 201

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400


def _alterar_status(reserva_id, operacao):
    usuario = g.usuario

    try:
        if operacao in ("aprovar", "rejeitar"):
            # Somente admin e operador podem aprovar ou rejeitar.
            if usuario["papel"] not in ("admin", "operador"):
                return jsonify({
                    "erro": "Permissão insuficiente."
                }), 403

            reserva = reserva_service.alterar_status(
                reserva_id, operacao
            )

        elif operacao == "cancelar":
            if usuario["papel"] == "aluno":
                solicitante_id = usuario["solicitante_id"]

                if solicitante_id is None:
                    return jsonify({
                        "erro": (
                            "Sua conta não está vinculada a um solicitante."
                        )
                    }), 403

                reserva = reserva_service.alterar_status(
                    reserva_id,
                    operacao,
                    solicitante_id=solicitante_id
                )
            else:
                reserva = reserva_service.alterar_status(
                    reserva_id, operacao
                )

        else:
            return jsonify({
                "erro": "Operação de reserva inválida."
            }), 400

        if reserva is None:
            return jsonify({"erro": "Reserva não encontrada."}), 404

        return jsonify({
            "mensagem": "Status da reserva atualizado com sucesso.",
            "reserva": reserva
        }), 200

    
    except ValueError as erro:
        if str(erro) == "Permissão insuficiente.":
            return jsonify({"erro": str(erro)}), 403
        return jsonify({"erro": str(erro)}), 400



@reservas_bp.route("/<int:reserva_id>/aprovar", methods=["PATCH"])
@requer_papeis("admin", "operador")
def aprovar_reserva(reserva_id):
    return _alterar_status(reserva_id, "aprovar")


@reservas_bp.route("/<int:reserva_id>/rejeitar", methods=["PATCH"])
@requer_papeis("admin", "operador")
def rejeitar_reserva(reserva_id):
    return _alterar_status(reserva_id, "rejeitar")


@reservas_bp.route("/<int:reserva_id>/cancelar", methods=["PATCH"])
@requer_autenticacao
def cancelar_reserva(reserva_id):
    return _alterar_status(reserva_id, "cancelar")
