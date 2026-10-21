import psycopg
from werkzeug.security import check_password_hash, generate_password_hash

from database.conexao import Conexao


class AuthService:
    @staticmethod
    def login(dados):
        email = dados.get("email")
        senha = dados.get("senha")

        if not isinstance(email, str) or not email.strip():
            raise ValueError("Informe um e-mail válido.")

        if not isinstance(senha, str) or not senha:
            raise ValueError("Informe a senha.")

        with Conexao.conectar() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, nome, email, senha_hash, papel,
                           ativo, solicitante_id
                    FROM usuarios
                    WHERE LOWER(email) = LOWER(%s)
                    """,
                    (email.strip(),)
                )
                usuario = cur.fetchone()

        if usuario is None or not usuario[5]:
            raise ValueError("E-mail ou senha inválidos.")

        if not check_password_hash(usuario[3], senha):
            raise ValueError("E-mail ou senha inválidos.")

        return {
            "id": usuario[0],
            "nome": usuario[1],
            "email": usuario[2],
            "papel": usuario[4],
            "solicitante_id": usuario[6]
        }

    @staticmethod
    def cadastrar_aluno(dados):
        nome = dados.get("nome")
        email = dados.get("email")
        senha = dados.get("senha")
        solicitante_id = dados.get("solicitante_id")

        if not isinstance(nome, str) or not nome.strip():
            raise ValueError("Informe o nome.")

        if not isinstance(email, str) or not email.strip():
            raise ValueError("Informe um e-mail válido.")

        if not isinstance(senha, str) or len(senha) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres.")

        if (
            not isinstance(solicitante_id, int)
            or isinstance(solicitante_id, bool)
            or solicitante_id <= 0
        ):
            raise ValueError("Informe um solicitante_id válido.")

        senha_hash = generate_password_hash(senha)

        try:
            with Conexao.conectar() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id
                        FROM solicitantes
                        WHERE id = %s
                          AND ativo = TRUE
                          AND tipo = 'aluno'
                        FOR UPDATE
                        """,
                        (solicitante_id,)
                    )
                    solicitante = cur.fetchone()

                    if solicitante is None:
                        raise ValueError(
                            "Aluno não encontrado ou cadastro inativo."
                        )

                    cur.execute(
                        """
                        SELECT id
                        FROM usuarios
                        WHERE LOWER(email) = LOWER(%s)
                        """,
                        (email.strip(),)
                    )
                    if cur.fetchone() is not None:
                        raise ValueError(
                            "Já existe uma conta com esse e-mail."
                        )

                    cur.execute(
                        """
                        INSERT INTO usuarios
                            (nome, email, senha_hash, papel,
                             ativo, solicitante_id)
                        VALUES (%s, %s, %s, 'aluno', TRUE, %s)
                        RETURNING id, nome, email, papel, solicitante_id
                        """,
                        (
                            nome.strip(),
                            email.strip(),
                            senha_hash,
                            solicitante_id
                        )
                    )
                    usuario = cur.fetchone()

        except psycopg.errors.UniqueViolation:
            raise ValueError(
                "Já existe uma conta para esse solicitante ou e-mail."
            )

        return {
            "id": usuario[0],
            "nome": usuario[1],
            "email": usuario[2],
            "papel": usuario[3],
            "solicitante_id": usuario[4]
        }
