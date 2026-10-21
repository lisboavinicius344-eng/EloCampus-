from datetime import datetime


class Emprestimo:
    STATUS_VALIDOS = ("em_andamento", "concluido", "cancelado")

    def __init__(
        self,
        solicitante_id,
        usuario_responsavel_id,
        data_prevista_devolucao,
        observacoes=None
    ):
        if not isinstance(solicitante_id, int) or solicitante_id <= 0:
            raise ValueError("O solicitante é obrigatório.")

        if not isinstance(usuario_responsavel_id, int) or usuario_responsavel_id <= 0:
            raise ValueError("O usuário responsável é obrigatório.")

        if not data_prevista_devolucao:
            raise ValueError("A data prevista para devolução é obrigatória.")

        self.solicitante_id = solicitante_id
        self.usuario_responsavel_id = usuario_responsavel_id
        self.data_prevista_devolucao = data_prevista_devolucao
        self.observacoes = observacoes