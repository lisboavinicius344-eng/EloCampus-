import psycopg

from database.conexao import Conexao
from models.solicitante import Solicitante


class SolicitanteService:

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT id, nome, tipo, setor, email, telefone, ativo, criado_em
                    FROM solicitantes
                    ORDER BY nome
                """)
                registros = cursor.fetchall()

        return [self._para_dict(r) for r in registros]

    def obter_por_id(self, solicitante_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT id, nome, tipo, setor, email, telefone, ativo, criado_em
                    FROM solicitantes
                    WHERE id = %s
                """, (solicitante_id,))
                registro = cursor.fetchone()

        return self._para_dict(registro) if registro else None

    def cadastrar(self, dados):
        solicitante = Solicitante(
            nome=dados.get("nome"),
            tipo=dados.get("tipo"),
            setor=dados.get("setor"),
            email=dados.get("email"),
            telefone=dados.get("telefone")
        )

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO solicitantes (nome, tipo, setor, email, telefone)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    solicitante.nome,
                    solicitante.tipo,
                    solicitante.setor,
                    solicitante.email,
                    solicitante.telefone
                ))
                solicitante_id = cursor.fetchone()[0]

        return self.obter_por_id(solicitante_id)

    def atualizar(self, solicitante_id, dados):
        solicitante = Solicitante(
            nome=dados.get("nome"),
            tipo=dados.get("tipo"),
            setor=dados.get("setor"),
            email=dados.get("email"),
            telefone=dados.get("telefone")
        )

        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    UPDATE solicitantes
                    SET nome = %s,
                        tipo = %s,
                        setor = %s,
                        email = %s,
                        telefone = %s
                    WHERE id = %s
                    RETURNING id
                """, (
                    solicitante.nome,
                    solicitante.tipo,
                    solicitante.setor,
                    solicitante.email,
                    solicitante.telefone,
                    solicitante_id
                ))
                registro = cursor.fetchone()

        if registro is None:
            return None

        return self.obter_por_id(solicitante_id)

    def desativar(self, solicitante_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    UPDATE solicitantes
                    SET ativo = FALSE
                    WHERE id = %s AND ativo = TRUE
                    RETURNING id
                """, (solicitante_id,))
                registro = cursor.fetchone()

        if registro is None:
            return None

        return self.obter_por_id(solicitante_id)

    @staticmethod
    def _para_dict(registro):
        if registro is None:
            return None

        return {
            "id": registro[0],
            "nome": registro[1],
            "tipo": registro[2],
            "setor": registro[3],
            "email": registro[4],
            "telefone": registro[5],
            "ativo": registro[6],
            "criado_em": (
                registro[7].isoformat()
                if registro[7] else None
            )
        }