
from getpass import getpass
from werkzeug.security import generate_password_hash
from database.conexao import Conexao

email = "admin.teste@elocampus.local"

senha = getpass("Digite a nova senha para o administrador: ")
confirmacao = getpass("Confirme a nova senha: ")

if len(senha) < 8:
    raise SystemExit("A senha deve ter pelo menos 8 caracteres.")

if senha != confirmacao:
    raise SystemExit("As senhas não coincidem.")

senha_hash = generate_password_hash(senha)

with Conexao.conectar() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE usuarios
            SET senha_hash = %s
            WHERE LOWER(email) = LOWER(%s)
              AND papel = 'admin'
              AND ativo = TRUE
            RETURNING id, email, papel
            """,
            (senha_hash, email)
        )
        usuario = cur.fetchone()

        if usuario is None:
            raise SystemExit(
                "Conta administrativa ativa não encontrada. Nada foi alterado."
            )

print(f"Senha redefinida para a conta: {usuario[1]}")
