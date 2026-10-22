
from getpass import getpass
from werkzeug.security import generate_password_hash
from database.conexao import Conexao

email = "aluno.teste2@elocampus.local"
nome = "Aluno Teste Dois"
solicitante_id = 2

senha = getpass("Digite uma senha de teste (mínimo 8 caracteres): ")
confirmacao = getpass("Confirme a senha: ")

if len(senha) < 8:
    raise SystemExit("A senha deve ter pelo menos 8 caracteres.")

if senha != confirmacao:
    raise SystemExit("As senhas não coincidem.")

senha_hash = generate_password_hash(senha)

with Conexao.conectar() as conn:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO usuarios
                (nome, email, senha_hash, papel, ativo, solicitante_id)
            VALUES (%s, %s, %s, 'aluno', TRUE, %s)
            RETURNING id, nome, email, papel, solicitante_id
            """,
            (nome, email, senha_hash, solicitante_id)
        )
        usuario = cur.fetchone()

print("Conta criada:", usuario)
