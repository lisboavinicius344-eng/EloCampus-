
class Equipamento:
    ESTADOS_CONSERVACAO_VALIDOS = (
        "novo",
        "bom",
        "regular",
        "danificado"
    )

    STATUS_VALIDOS = (
        "disponivel",
        "emprestado",
        "manutencao",
        "baixado"
    )

    def __init__(
        self,
        nome,
        categoria_id,
        numero_patrimonio=None,
        setor=None,
        localizacao=None,
        estado_conservacao="bom",
        status="disponivel",
        qr_code=None,
        observacoes=None
    ):
        if not isinstance(nome, str) or not nome.strip():
            raise ValueError("O nome do equipamento é obrigatório.")

        self.nome = nome.strip()
        self.categoria_id = categoria_id
        self.numero_patrimonio = numero_patrimonio
        self.setor = setor
        self.localizacao = localizacao
        self.estado_conservacao = estado_conservacao
        self.status = status
        self.qr_code = qr_code
        self.observacoes = observacoes

    @property
    def estado_conservacao(self):
        return self._estado_conservacao

    @estado_conservacao.setter
    def estado_conservacao(self, valor):
        if valor not in self.ESTADOS_CONSERVACAO_VALIDOS:
            raise ValueError("Estado de conservação inválido.")
        self._estado_conservacao = valor

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, valor):
        if valor not in self.STATUS_VALIDOS:
            raise ValueError("Status do equipamento inválido.")
        self._status = valor

    def esta_disponivel(self):
        return self.status == "disponivel"