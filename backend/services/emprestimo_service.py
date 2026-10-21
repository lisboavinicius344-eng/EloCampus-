
from datetime import datetime

import psycopg

from database.conexao import Conexao
from models.emprestimo import Emprestimo


class EmprestimoService:

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        e.id, e.solicitante_id, s.nome,
                        e.usuario_responsavel_id, u.nome,
                        e.data_emprestimo, e.data_prevista_devolucao,
                        e.status, e.observacoes
                    FROM emprestimos e
                    JOIN solicitantes s ON s.id = e.solicitante_id
                    JOIN usuarios u ON u.id = e.usuario_responsavel_id
                    ORDER BY e.id DESC
                """)
                registros = cursor.fetchall()

        return [self._para_dict(r) for r in registros]

    def listar_por_solicitante(self, solicitante_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        e.id, e.solicitante_id, s.nome,
                        e.usuario_responsavel_id, u.nome,
                        e.data_emprestimo, e.data_prevista_devolucao,
                        e.status, e.observacoes
                    FROM emprestimos e
                    JOIN solicitantes s ON s.id = e.solicitante_id
                    JOIN usuarios u ON u.id = e.usuario_responsavel_id
                    WHERE e.solicitante_id = %s
                    ORDER BY e.id DESC
                """, (solicitante_id,))
                registros = cursor.fetchall()

        return [self._para_dict(r) for r in registros]

    def obter_por_id(self, emprestimo_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        e.id, e.solicitante_id, s.nome,
                        e.usuario_responsavel_id, u.nome,
                        e.data_emprestimo, e.data_prevista_devolucao,
                        e.status, e.observacoes
                    FROM emprestimos e
                    JOIN solicitantes s ON s.id = e.solicitante_id
                    JOIN usuarios u ON u.id = e.usuario_responsavel_id
                    WHERE e.id = %s
                """, (emprestimo_id,))
                registro = cursor.fetchone()

                if registro is None:
                    return None

                emprestimo = self._para_dict(registro)

                cursor.execute("""
                    SELECT
                        ie.equipamento_id, eq.nome,
                        ie.estado_na_retirada, ie.data_devolucao,
                        ie.estado_na_devolucao, ie.observacoes
                    FROM itens_emprestimo ie
                    JOIN equipamentos eq ON eq.id = ie.equipamento_id
                    WHERE ie.emprestimo_id = %s
                    ORDER BY ie.id
                """, (emprestimo_id,))
                itens = cursor.fetchall()

        emprestimo["itens"] = [
            {
                "equipamento_id": item[0],
                "equipamento": item[1],
                "estado_na_retirada": item[2],
                "data_devolucao": (
                    item[3].isoformat() if item[3] else None
                ),
                "estado_na_devolucao": item[4],
                "observacoes": item[5]
            }
            for item in itens
        ]

        return emprestimo

    def cadastrar(self, dados):
        itens = dados.get("equipamentos")

        if not isinstance(itens, list) or not itens:
            raise ValueError(
                "Informe uma lista de equipamentos para o empréstimo."
            )

        if any(
            not isinstance(i, int) or isinstance(i, bool) or i <= 0
            for i in itens
        ):
            raise ValueError(
                "Os IDs dos equipamentos devem ser números inteiros positivos."
            )

        if len(itens) != len(set(itens)):
            raise ValueError("Não repita equipamentos no mesmo empréstimo.")

        try:
            solicitante_id = int(dados.get("solicitante_id"))
            usuario_id = int(dados.get("usuario_responsavel_id"))
        except (TypeError, ValueError):
            raise ValueError(
                "Informe IDs válidos para solicitante e usuário responsável."
            ) from None

        previsto = dados.get("data_prevista_devolucao")

        if not isinstance(previsto, str):
            raise ValueError(
                "Informe data_prevista_devolucao em formato ISO 8601."
            )

        try:
            data_prevista = datetime.fromisoformat(
                previsto.replace("Z", "+00:00")
            )
        except ValueError:
            raise ValueError(
                "Data inválida. Use o formato ISO 8601."
            ) from None

        Emprestimo(
            solicitante_id,
            usuario_id,
            data_prevista
        )

        try:
            with Conexao.conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute("""
                        SELECT id
                        FROM solicitantes
                        WHERE id = %s AND ativo = TRUE
                    """, (solicitante_id,))

                    if cursor.fetchone() is None:
                        raise ValueError(
                            "Solicitante não encontrado ou inativo."
                        )

                    cursor.execute("""
                        SELECT id
                        FROM usuarios
                        WHERE id = %s AND ativo = TRUE
                    """, (usuario_id,))

                    if cursor.fetchone() is None:
                        raise ValueError(
                            "Usuário responsável não encontrado ou inativo."
                        )

                    cursor.execute("""
                        SELECT id, status, estado_conservacao
                        FROM equipamentos
                        WHERE id = ANY(%s)
                        ORDER BY id
                        FOR UPDATE
                    """, (itens,))
                    equipamentos = cursor.fetchall()

                    if len(equipamentos) != len(itens):
                        raise ValueError(
                            "Um ou mais equipamentos não foram encontrados."
                        )

                    for equipamento in equipamentos:
                        if equipamento[1] != "disponivel":
                            raise ValueError(
                                f"Equipamento {equipamento[0]} "
                                "não está disponível."
                            )

                        if equipamento[2] == "danificado":
                            raise ValueError(
                                f"Equipamento {equipamento[0]} está danificado."
                            )

                    cursor.execute("""
                        INSERT INTO emprestimos (
                            solicitante_id,
                            usuario_responsavel_id,
                            data_prevista_devolucao,
                            observacoes
                        )
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                    """, (
                        solicitante_id,
                        usuario_id,
                        data_prevista,
                        dados.get("observacoes")
                    ))
                    emprestimo_id = cursor.fetchone()[0]

                    for equipamento_id in itens:
                        cursor.execute("""
                            INSERT INTO itens_emprestimo (
                                emprestimo_id,
                                equipamento_id,
                                estado_na_retirada
                            )
                            SELECT %s, id, estado_conservacao
                            FROM equipamentos
                            WHERE id = %s
                        """, (emprestimo_id, equipamento_id))

                        cursor.execute("""
                            UPDATE equipamentos
                            SET status = 'emprestado'
                            WHERE id = %s
                        """, (equipamento_id,))

                        cursor.execute("""
                            INSERT INTO historico_movimentacoes (
                                equipamento_id,
                                usuario_id,
                                emprestimo_id,
                                tipo_movimentacao,
                                descricao
                            )
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            equipamento_id,
                            usuario_id,
                            emprestimo_id,
                            "emprestimo",
                            "Equipamento emprestado."
                        ))

        except ValueError:
            raise
        except Exception as erro:
            if isinstance(erro, psycopg.errors.ForeignKeyViolation):
                raise ValueError(
                    "Solicitante ou usuário responsável inválido."
                ) from None
            raise

        return self.obter_por_id(emprestimo_id)

    def devolver_equipamento(
        self,
        emprestimo_id,
        equipamento_id,
        estado_na_devolucao,
        usuario_id,
        observacoes=None
    ):
        estados_validos = ("novo", "bom", "regular", "danificado")

        if estado_na_devolucao not in estados_validos:
            raise ValueError("Estado de conservação inválido.")

        if (
            not isinstance(usuario_id, int)
            or isinstance(usuario_id, bool)
            or usuario_id <= 0
        ):
            raise ValueError("Informe um usuário responsável válido.")

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT status
                    FROM emprestimos
                    WHERE id = %s
                    FOR UPDATE
                """, (emprestimo_id,))
                emprestimo = cursor.fetchone()

                if emprestimo is None:
                    raise ValueError("Empréstimo não encontrado.")

                if emprestimo[0] != "em_andamento":
                    raise ValueError("O empréstimo não está em andamento.")

                cursor.execute("""
                    SELECT id
                    FROM usuarios
                    WHERE id = %s AND ativo = TRUE
                """, (usuario_id,))

                if cursor.fetchone() is None:
                    raise ValueError(
                        "Usuário responsável não encontrado ou inativo."
                    )

                cursor.execute("""
                    SELECT ie.id, e.status
                    FROM itens_emprestimo ie
                    JOIN equipamentos e ON e.id = ie.equipamento_id
                    WHERE ie.emprestimo_id = %s
                      AND ie.equipamento_id = %s
                      AND ie.data_devolucao IS NULL
                    FOR UPDATE OF ie, e
                """, (emprestimo_id, equipamento_id))
                item = cursor.fetchone()

                if item is None:
                    raise ValueError(
                        "Item não encontrado ou já devolvido."
                    )

                cursor.execute("""
                    UPDATE itens_emprestimo
                    SET data_devolucao = NOW(),
                        estado_na_devolucao = %s,
                        observacoes = %s
                    WHERE id = %s
                """, (
                    estado_na_devolucao,
                    observacoes,
                    item[0]
                ))

                novo_status = (
                    "manutencao"
                    if estado_na_devolucao == "danificado"
                    else "disponivel"
                )

                cursor.execute("""
                    UPDATE equipamentos
                    SET status = %s,
                        estado_conservacao = %s
                    WHERE id = %s
                """, (
                    novo_status,
                    estado_na_devolucao,
                    equipamento_id
                ))

                cursor.execute("""
                    INSERT INTO historico_movimentacoes (
                        equipamento_id,
                        usuario_id,
                        emprestimo_id,
                        tipo_movimentacao,
                        descricao
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    equipamento_id,
                    usuario_id,
                    emprestimo_id,
                    "devolucao",
                    "Equipamento devolvido."
                ))

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM itens_emprestimo
                    WHERE emprestimo_id = %s
                      AND data_devolucao IS NULL
                """, (emprestimo_id,))
                itens_pendentes = cursor.fetchone()[0]

                if itens_pendentes == 0:
                    cursor.execute("""
                        UPDATE emprestimos
                        SET status = 'concluido'
                        WHERE id = %s
                    """, (emprestimo_id,))

        return self.obter_por_id(emprestimo_id)

    @staticmethod
    def _para_dict(r):
        return {
            "id": r[0],
            "solicitante_id": r[1],
            "solicitante": r[2],
            "usuario_responsavel_id": r[3],
            "usuario_responsavel": r[4],
            "data_emprestimo": r[5].isoformat() if r[5] else None,
            "data_prevista_devolucao": (
                r[6].isoformat() if r[6] else None
            ),
            "status": r[7],
            "observacoes": r[8]
        }
