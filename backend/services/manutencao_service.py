from datetime import datetime, timezone

from database.conexao import Conexao


class ManutencaoService:

    STATUS_VALIDOS = ("aberta", "em_andamento", "concluida", "cancelada")

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        m.id,
                        m.equipamento_id,
                        e.nome,
                        e.numero_patrimonio,
                        m.usuario_responsavel_id,
                        u.nome,
                        m.descricao_problema,
                        m.data_abertura,
                        m.data_conclusao,
                        m.status,
                        m.solucao,
                        m.observacoes
                    FROM manutencoes m
                    JOIN equipamentos e ON e.id = m.equipamento_id
                    LEFT JOIN usuarios u
                        ON u.id = m.usuario_responsavel_id
                    ORDER BY m.id DESC
                """)
                registros = cursor.fetchall()

        return [self._para_dict(r) for r in registros]

    def obter_por_id(self, manutencao_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        m.id,
                        m.equipamento_id,
                        e.nome,
                        e.numero_patrimonio,
                        m.usuario_responsavel_id,
                        u.nome,
                        m.descricao_problema,
                        m.data_abertura,
                        m.data_conclusao,
                        m.status,
                        m.solucao,
                        m.observacoes
                    FROM manutencoes m
                    JOIN equipamentos e ON e.id = m.equipamento_id
                    LEFT JOIN usuarios u
                        ON u.id = m.usuario_responsavel_id
                    WHERE m.id = %s
                """, (manutencao_id,))
                registro = cursor.fetchone()

        return self._para_dict(registro) if registro else None

    def cadastrar(self, dados):
        equipamento_id = dados.get("equipamento_id")
        responsavel_id = dados.get("usuario_responsavel_id")
        descricao = dados.get("descricao_problema")
        observacoes = dados.get("observacoes")

        if (
            not isinstance(equipamento_id, int)
            or isinstance(equipamento_id, bool)
            or equipamento_id <= 0
        ):
            raise ValueError("Informe um equipamento válido.")

        if not isinstance(descricao, str) or not descricao.strip():
            raise ValueError("A descrição do problema é obrigatória.")

        if responsavel_id is not None and (
            not isinstance(responsavel_id, int)
            or isinstance(responsavel_id, bool)
            or responsavel_id <= 0
        ):
            raise ValueError("O responsável informado é inválido.")

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT id, status
                    FROM equipamentos
                    WHERE id = %s
                    FOR UPDATE
                """, (equipamento_id,))
                equipamento = cursor.fetchone()

                if equipamento is None:
                    raise ValueError("Equipamento não encontrado.")

                if equipamento[1] == "baixado":
                    raise ValueError(
                        "Não é possível abrir manutenção para equipamento baixado."
                    )

                if responsavel_id is not None:
                    cursor.execute("""
                        SELECT id
                        FROM usuarios
                        WHERE id = %s AND ativo = TRUE
                    """, (responsavel_id,))

                    if cursor.fetchone() is None:
                        raise ValueError(
                            "Responsável não encontrado ou inativo."
                        )

                cursor.execute("""
                    SELECT id
                    FROM manutencoes
                    WHERE equipamento_id = %s
                      AND status IN ('aberta', 'em_andamento')
                    LIMIT 1
                """, (equipamento_id,))

                if cursor.fetchone():
                    raise ValueError(
                        "Este equipamento já possui uma manutenção em aberto."
                    )

                cursor.execute("""
                    INSERT INTO manutencoes (
                        equipamento_id,
                        usuario_responsavel_id,
                        descricao_problema,
                        data_abertura,
                        status,
                        observacoes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    equipamento_id,
                    responsavel_id,
                    descricao.strip(),
                    datetime.now(timezone.utc),
                    "aberta",
                    observacoes
                ))

                manutencao_id = cursor.fetchone()[0]

                cursor.execute("""
                    UPDATE equipamentos
                    SET status = 'manutencao'
                    WHERE id = %s
                """, (equipamento_id,))

        return self.obter_por_id(manutencao_id)

    def finalizar(self, manutencao_id, dados):
        solucao = dados.get("solucao")
        observacoes = dados.get("observacoes")

        if not isinstance(solucao, str) or not solucao.strip():
            raise ValueError("Informe a solução aplicada.")

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT equipamento_id, status
                    FROM manutencoes
                    WHERE id = %s
                    FOR UPDATE
                """, (manutencao_id,))
                manutencao = cursor.fetchone()

                if manutencao is None:
                    return None

                equipamento_id, status_atual = manutencao

                if status_atual not in ("aberta", "em_andamento"):
                    raise ValueError(
                        "A manutenção não está aberta para finalização."
                    )

                cursor.execute("""
                    SELECT status
                    FROM equipamentos
                    WHERE id = %s
                    FOR UPDATE
                """, (equipamento_id,))
                equipamento = cursor.fetchone()

                if equipamento is None:
                    raise ValueError("Equipamento não encontrado.")

                if equipamento[0] == "baixado":
                    raise ValueError(
                        "O equipamento está baixado e não pode voltar a ficar disponível."
                    )

                cursor.execute("""
                    UPDATE manutencoes
                    SET status = 'concluida',
                        data_conclusao = %s,
                        solucao = %s,
                        observacoes = COALESCE(%s, observacoes)
                    WHERE id = %s
                """, (
                    datetime.now(timezone.utc),
                    solucao.strip(),
                    observacoes,
                    manutencao_id
                ))

                cursor.execute("""
                    UPDATE equipamentos
                    SET status = 'disponivel'
                    WHERE id = %s
                      AND status = 'manutencao'
                """, (equipamento_id,))

        return self.obter_por_id(manutencao_id)

    @staticmethod
    def _para_dict(registro):
        return {
            "id": registro[0],
            "equipamento_id": registro[1],
            "equipamento": registro[2],
            "numero_patrimonio": registro[3],
            "usuario_responsavel_id": registro[4],
            "responsavel": registro[5],
            "descricao_problema": registro[6],
            "data_abertura": (
                registro[7].isoformat() if registro[7] else None
            ),
            "data_conclusao": (
                registro[8].isoformat() if registro[8] else None
            ),
            "status": registro[9],
            "solucao": registro[10],
            "observacoes": registro[11]
        }
