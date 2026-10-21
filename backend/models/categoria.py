class Categoria:
    def __init__(self, nome, descricao=None, ativo=True):
        if not isinstance(nome, str) or not nome.strip():
            raise ValueError("O nome da categoria é obrigatório.")

        self.nome = nome.strip()
        self.descricao = descricao
        self.ativo = ativo
