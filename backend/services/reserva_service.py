
from datetime import datetime

from database.conexao import Conexao
from models.reserva import Reserva


class ReservaService:

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT r.id, r.solicitante_id, s.nome,
                           r.usuario_responsavel_id, u.nome,
                           r.data_inicio, r.data_fim,
                           r.status, r.observacoes, r.criado_em
                    FROM reservas r
                    JOIN solicitantes s ON s.id = r.solicitante_id
                    LEFT JOIN usuarios u ON u.id = r.usuario_responsavel_id
                    ORDER BY r.id DESC
                """)
                registros = cursor.fetchall()

        return [self._para_dict(registro) for registro in registros]

    def listar_por_solicitante(self, solicitante_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT r.id, r.solicitante_id, s.nome,
                           r.usuario_responsavel_id, u.nome,
                           r.data_inicio, r.data_fim,
                           r.status, r.observacoes, r.criado_em
                    FROM reservas r
                    JOIN solicitantes s ON s.id = r.solicitante_id
                    LEFT JOIN usuarios u ON u.id = r.usuario_responsavel_id
                    WHERE r.solicitante_id = %s
                    ORDER BY r.id DESC
                """, (solicitante_id,))
                registros = cursor.fetchall()

        return [self._para_dict(registro) for registro in registros]

    def obter_por_id(self, reserva_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT r.id, r.solicitante_id, s.nome,
                           r.usuario_responsavel_id, u.nome,
                           r.data_inicio, r.data_fim,
                           r.status, r.observacoes, r.criado_em
                    FROM reservas r
                    JOIN solicitantes s ON s.id = r.solicitante_id
                    LEFT JOIN usuarios u ON u.id = r.usuario_responsavel_id
                    WHERE r.id = %s
                """, (reserva_id,))

                registro = cursor.fetchone()

                if registro is None:
                    return None

                reserva = self._para_dict(registro)

                cursor.execute("""
                    SELECT ir.equipamento_id, e.nome, e.status
                    FROM itens_reserva ir
                    JOIN equipamentos e ON e.id = ir.equipamento_id
                    WHERE ir.reserva_id = %s
                    ORDER BY ir.id
                """, (reserva_id,))

                itens = cursor.fetchall()

        reserva["itens"] = [
            {
                "equipamento_id": item[0],
                "equipamento": item[1],
                "status_equipamento": item[2]
            }
            for item in itens
        ]

        return reserva

    def cadastrar(self, dados):
        ids = dados.get("equipamentos")

        if not isinstance(ids, list) or not ids:
            raise ValueError(
                "Informe uma lista de IDs de equipamentos."
            )

        if any(
            not isinstance(equipamento_id, int)
            or isinstance(equipamento_id, bool)
            or equipamento_id <= 0
            for equipamento_id in ids
        ):
            raise ValueError(
                "Os IDs dos equipamentos devem ser inteiros positivos."
            )

        if len(ids) != len(set(ids)):
            raise ValueError(
                "Não repita equipamentos na mesma reserva."
            )

        solicitante_id = dados.get("solicitante_id")
        responsavel_id = dados.get("usuario_responsavel_id")

        if (
            not isinstance(solicitante_id, int)
            or isinstance(solicitante_id, bool)
            or solicitante_id <= 0
        ):
            raise ValueError("Informe um ID de solicitante válido.")

        if responsavel_id is not None and (
            not isinstance(responsavel_id, int)
            or isinstance(responsavel_id, bool)
            or responsavel_id <= 0
        ):
            raise ValueError(
                "O ID do responsável deve ser um inteiro positivo."
            )

        inicio_texto = dados.get("data_inicio")
        fim_texto = dados.get("data_fim")

        if (
            not isinstance(inicio_texto, str)
            or not isinstance(fim_texto, str)
        ):
            raise ValueError(
                "Informe data_inicio e data_fim em formato ISO 8601."
            )

        try:
            inicio = datetime.fromisoformat(
                inicio_texto.replace("Z", "+00:00")
            )
            fim = datetime.fromisoformat(
                fim_texto.replace("Z", "+00:00")
            )
        except ValueError:
            raise ValueError(
                "As datas são inválidas. Use o formato ISO 8601."
            )

        if inicio.tzinfo is None or fim.tzinfo is None:
            raise ValueError(
                "As datas devem incluir o fuso horário, "
                "por exemplo -03:00."
            )

        if inicio.utcoffset() != fim.utcoffset():
            # Evita comparações ambíguas entre datas com fusos diferentes.
            inicio_utc = inicio.astimezone()
            fim_utc = fim.astimezone()
            if fim_utc <= inicio_utc:
                raise ValueError(
                    "A data final deve ser posterior à data inicial."
                )
        elif fim <= inicio:
            raise ValueError(
                "A data final deve ser posterior à data inicial."
            )

        Reserva(
            solicitante_id=solicitante_id,
            data_inicio=inicio,
            data_fim=fim,
            usuario_responsavel_id=responsavel_id,
            observacoes=dados.get("observacoes")
        )

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

                # Bloqueia os equipamentos durante a validação.
                cursor.execute("""
                    SELECT id, status
                    FROM equipamentos
                    WHERE id = ANY(%s)
                    ORDER BY id
                    FOR UPDATE
                """, (ids,))

                equipamentos = cursor.fetchall()

                if len(equipamentos) != len(ids):
                    raise ValueError(
                        "Um ou mais equipamentos não foram encontrados."
                    )

                indisponiveis = [
                    equipamento_id
                    for equipamento_id, status in equipamentos
                    if status != "disponivel"
                ]

                if indisponiveis:
                    raise ValueError(
                        f"Equipamentos indisponíveis: {indisponiveis}."
                    )

                # Verifica conflitos com reservas pendentes ou aprovadas.
                cursor.execute("""
                    SELECT DISTINCT ir.equipamento_id
                    FROM itens_reserva ir
                    JOIN reservas r ON r.id = ir.reserva_id
                    WHERE ir.equipamento_id = ANY(%s)
                      AND r.status IN ('pendente', 'aprovada')
                      AND r.data_inicio < %s
                      AND r.data_fim > %s
                """, (ids, fim, inicio))

                conflitos = [
                    registro[0] for registro in cursor.fetchall()
                ]

                if conflitos:
                    raise ValueError(
                        "Equipamentos com reservas conflitantes: "
                        f"{conflitos}."
                    )

                # Verifica conflitos com empréstimos em andamento.
                cursor.execute("""
                    SELECT DISTINCT ie.equipamento_id
                    FROM itens_emprestimo ie
                    JOIN emprestimos em ON em.id = ie.emprestimo_id
                    WHERE ie.equipamento_id = ANY(%s)
                      AND ie.data_devolucao IS NULL
                      AND em.status = 'em_andamento'
                      AND em.data_emprestimo < %s
                      AND em.data_prevista_devolucao > %s
                """, (ids, fim, inicio))

                conflitos_emprestimos = [
                    registro[0] for registro in cursor.fetchall()
                ]

                if conflitos_emprestimos:
                    raise ValueError(
                        "Equipamentos com empréstimos conflitantes: "
                        f"{conflitos_emprestimos}."
                    )

                cursor.execute("""
                    INSERT INTO reservas (
                        solicitante_id,
                        usuario_responsavel_id,
                        data_inicio,
                        data_fim,
                        observacoes
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    solicitante_id,
                    responsavel_id,
                    inicio,
                    fim,
                    dados.get("observacoes")
                ))

                reserva_id = cursor.fetchone()[0]

                for equipamento_id in ids:
                    cursor.execute("""
                        INSERT INTO itens_reserva (
                            reserva_id,
                            equipamento_id
                        )
                        VALUES (%s, %s)
                    """, (reserva_id, equipamento_id))

        return self.obter_por_id(reserva_id)

    def alterar_status(
        self,
        reserva_id,
        operacao,
        solicitante_id=None
    ):
        transicoes = {
            "aprovar": (("pendente",), "aprovada"),
            "rejeitar": (("pendente",), "rejeitada"),
            "cancelar": (("pendente", "aprovada"), "cancelada")
        }

        if operacao not in transicoes:
            raise ValueError("Operação de reserva inválida.")

        status_permitidos, status_novo = transicoes[operacao]

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT status, data_inicio, data_fim, solicitante_id
                    FROM reservas
                    WHERE id = %s
                    FOR UPDATE
                """, (reserva_id,))

                reserva = cursor.fetchone()

                if reserva is None:
                    return None

                (
                    status_atual,
                    inicio,
                    fim,
                    dono_reserva_id
                ) = reserva

                # Quando informado, garante que o aluno cancele
                # somente uma reserva vinculada ao seu solicitante.
                if (
                    operacao == "cancelar"
                    and solicitante_id is not None
                    and dono_reserva_id != solicitante_id
                ):
                    raise ValueError("Permissão insuficiente.")

                if status_atual not in status_permitidos:
                    raise ValueError(
                        f"Não é possível {operacao} uma reserva com "
                        f"status '{status_atual}'."
                    )

                if operacao == "aprovar":
                    # Confere se os equipamentos continuam disponíveis.
                    cursor.execute("""
                        SELECT ir.equipamento_id
                        FROM itens_reserva ir
                        JOIN equipamentos e ON e.id = ir.equipamento_id
                        WHERE ir.reserva_id = %s
                          AND e.status <> 'disponivel'
                    """, (reserva_id,))

                    indisponiveis = [
                        registro[0] for registro in cursor.fetchall()
                    ]

                    if indisponiveis:
                        raise ValueError(
                            f"Equipamentos indisponíveis: {indisponiveis}."
                        )

                    # Confere conflitos com outras reservas.
                    cursor.execute("""
                        SELECT DISTINCT ir.equipamento_id
                        FROM itens_reserva ir
                        JOIN itens_reserva outro
                          ON outro.equipamento_id = ir.equipamento_id
                         AND outro.reserva_id <> ir.reserva_id
                        JOIN reservas r ON r.id = outro.reserva_id
                        WHERE ir.reserva_id = %s
                          AND r.status IN ('pendente', 'aprovada')
                          AND r.data_inicio < %s
                          AND r.data_fim > %s
                    """, (reserva_id, fim, inicio))

                    conflitos = [
                        registro[0] for registro in cursor.fetchall()
                    ]

                    if conflitos:
                        raise ValueError(
                            "Equipamentos com reservas conflitantes: "
                            f"{conflitos}."
                        )

                    # Confere conflitos com empréstimos em andamento.
                    cursor.execute("""
                        SELECT DISTINCT ie.equipamento_id
                        FROM itens_reserva ir
                        JOIN itens_emprestimo ie
                          ON ie.equipamento_id = ir.equipamento_id
                        JOIN emprestimos em
                          ON em.id = ie.emprestimo_id
                        WHERE ir.reserva_id = %s
                          AND ie.data_devolucao IS NULL
                          AND em.status = 'em_andamento'
                          AND em.data_emprestimo < %s
                          AND em.data_prevista_devolucao > %s
                    """, (reserva_id, fim, inicio))

                    conflitos_emprestimos = [
                        registro[0] for registro in cursor.fetchall()
                    ]

                    if conflitos_emprestimos:
                        raise ValueError(
                            "Equipamentos com empréstimos conflitantes: "
                            f"{conflitos_emprestimos}."
                        )

                cursor.execute("""
                    UPDATE reservas
                    SET status = %s
                    WHERE id = %s
                """, (status_novo, reserva_id))

        return self.obter_por_id(reserva_id)

    @staticmethod
    def _para_dict(registro):
        return {
            "id": registro[0],
            "solicitante_id": registro[1],
            "solicitante": registro[2],
            "usuario_responsavel_id": registro[3],
            "usuario_responsavel": registro[4],
            "data_inicio": (
                registro[5].isoformat() if registro[5] else None
            ),
            "data_fim": (
                registro[6].isoformat() if registro[6] else None
            ),
            "status": registro[7],
            "observacoes": registro[8],
            "criado_em": (
                registro[9].isoformat() if registro[9] else None
            )
        }
