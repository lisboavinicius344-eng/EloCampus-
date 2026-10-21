import psycopg

from database.conexao import Conexao
from models.categoria import Categoria


class CategoriaService:

    def listar(self):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT id, nome, descricao, ativo
                    FROM categorias
                    ORDER BY nome
                """)
                registros = cursor.fetchall()

        return [
            {
                "id": r[0],
                "nome": r[1],
                "descricao": r[2],
                "ativo": r[3]
            }
            for r in registros
        ]

    def obter_por_id(self, categoria_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT id, nome, descricao, ativo
                    FROM categorias
                    WHERE id = %s
                """, (categoria_id,))
                r = cursor.fetchone()

        if r is None:
            return None

        return {
            "id": r[0],
            "nome": r[1],
            "descricao": r[2],
            "ativo": r[3]
        }

    def cadastrar(self, dados):
        categoria = Categoria(
            nome=dados.get("nome"),
            descricao=dados.get("descricao")
        )

        try:
            with Conexao.conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO categorias (nome, descricao)
                        VALUES (%s, %s)
                        RETURNING id
                    """, (categoria.nome, categoria.descricao))
                    categoria_id = cursor.fetchone()[0]

        except psycopg.errors.UniqueViolation:
            raise ValueError(
                "Já existe uma categoria com esse nome."
            ) from None

        return self.obter_por_id(categoria_id)

    def atualizar(self, categoria_id, dados):
        categoria = Categoria(
            nome=dados.get("nome"),
            descricao=dados.get("descricao")
        )

        try:
            with Conexao.conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute("""
                        UPDATE categorias
                        SET nome = %s, descricao = %s
                        WHERE id = %s
                        RETURNING id
                    """, (
                        categoria.nome,
                        categoria.descricao,
                        categoria_id
                    ))
                    registro = cursor.fetchone()

        except psycopg.errors.UniqueViolation:
            raise ValueError(
                "Já existe uma categoria com esse nome."
            ) from None

        if registro is None:
            return None

        return self.obter_por_id(categoria_id)

    def desativar(self, categoria_id):
        with Conexao.conectar() as conexao:
            with conexao.cursor() as cursor:
                cursor.execute("""
                    SELECT ativo
                    FROM categorias
                    WHERE id = %s
                    FOR UPDATE
                """, (categoria_id,))
                registro = cursor.fetchone()

                if registro is None:
                    return None

                if not registro[0]:
                    raise ValueError("A categoria já está desativada.")

                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM equipamentos
                        WHERE categoria_id = %s
                          AND status <> 'baixado'
                    )
                """, (categoria_id,))

                possui_equipamentos = cursor.fetchone()[0]

                if possui_equipamentos:
                    raise ValueError(
                        "Não é possível desativar uma categoria "
                        "que possui equipamentos ativos."
                    )

                cursor.execute("""
                    UPDATE categorias
                    SET ativo = FALSE
                    WHERE id = %s
                """, (categoria_id,))

        return self.obter_por_id(categoria_id)