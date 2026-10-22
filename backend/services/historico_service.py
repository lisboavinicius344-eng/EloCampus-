from datetime import datetime, timezone

from database.conexao import Conexao


class HistoricoService:

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        h.id,
                        h.equipamento_id,
                        e.nome AS equipamento_nome,
                        h.usuario_id,
                        u.nome AS usuario_nome,
                        h.emprestimo_id,
                        h.tipo_movimentacao,
                        h.data_movimentacao,
                        h.descricao
                    FROM historico_movimentacoes h
                    JOIN equipamentos e
                        ON e.id = h.equipamento_id
                    LEFT JOIN usuarios u
                        ON u.id = h.usuario_id
                    ORDER BY h.data_movimentacao DESC, h.id DESC
                """)
                registros = cursor.fetchall()

        return [self._para_dict(r) for r in registros]

    def obter_por_id(self, historico_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        h.id,
                        h.equipamento_id,
                        e.nome AS equipamento_nome,
                        h.usuario_id,
                        u.nome AS usuario_nome,
                        h.emprestimo_id,
                        h.tipo_movimentacao,
                        h.data_movimentacao,
                        h.descricao
                    FROM historico_movimentacoes h
                    JOIN equipamentos e
                        ON e.id = h.equipamento_id
                    LEFT JOIN usuarios u
                        ON u.id = h.usuario_id
                    WHERE h.id = %s
                """, (historico_id,))
                registro = cursor.fetchone()

        return self._para_dict(registro) if registro else None

    def cadastrar(self, dados):
        equipamento_id = dados.get("equipamento_id")
        usuario_id = dados.get("usuario_id")
        emprestimo_id = dados.get("emprestimo_id")
        tipo = dados.get("tipo_movimentacao")
        descricao = dados.get("descricao")

        if (
            not isinstance(equipamento_id, int)
            or isinstance(equipamento_id, bool)
            or equipamento_id <= 0
        ):
            raise ValueError("Informe um equipamento_id válido.")

        if (
            not isinstance(tipo, str)
            or not tipo.strip()
        ):
            raise ValueError("O tipo de movimentação é obrigatório.")

        if usuario_id is not None and (
            not isinstance(usuario_id, int)
            or isinstance(usuario_id, bool)
            or usuario_id <= 0
        ):
            raise ValueError("Informe um usuario_id válido.")

        if emprestimo_id is not None and (
            not isinstance(emprestimo_id, int)
            or isinstance(emprestimo_id, bool)
            or emprestimo_id <= 0
        ):
            raise ValueError("Informe um emprestimo_id válido.")

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM equipamentos WHERE id = %s",
                    (equipamento_id,)
                )
                if cursor.fetchone() is None:
                    raise ValueError("Equipamento não encontrado.")

                if usuario_id is not None:
                    cursor.execute(
                        "SELECT id FROM usuarios WHERE id = %s",
                        (usuario_id,)
                    )
                    if cursor.fetchone() is None:
                        raise ValueError("Usuário não encontrado.")

                if emprestimo_id is not None:
                    cursor.execute("""
                        SELECT id
                        FROM emprestimos
                        WHERE id = %s
                    """, (emprestimo_id,))
                    if cursor.fetchone() is None:
                        raise ValueError("Empréstimo não encontrado.")

                cursor.execute("""
                    INSERT INTO historico_movimentacoes (
                        equipamento_id,
                        usuario_id,
                        emprestimo_id,
                        tipo_movimentacao,
                        data_movimentacao,
                        descricao
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    equipamento_id,
                    usuario_id,
                    emprestimo_id,
                    tipo.strip(),
                    datetime.now(timezone.utc),
                    descricao
                ))

                historico_id = cursor.fetchone()[0]

        return self.obter_por_id(historico_id)

    @staticmethod
    def _para_dict(registro):
        return {
            "id": registro[0],
            "equipamento_id": registro[1],
            "equipamento_nome": registro[2],
            "usuario_id": registro[3],
            "usuario_nome": registro[4],
            "emprestimo_id": registro[5],
            "tipo_movimentacao": registro[6],
            "data_movimentacao": (
                registro[7].isoformat() if registro[7] else None
            ),
            "descricao": registro[8]
        }
