from flask import Flask, jsonify

from routes.emprestimos import emprestimos_bp
from routes.equipamentos import equipamentos_bp
from routes.categorias import categorias_bp
from routes.solicitantes import solicitantes_bp
from routes.reservas import reservas_bp
from routes.manutencoes import manutencoes_bp
from routes.historico import historico_bp
from routes.auth import auth_bp



app = Flask(__name__)

app.register_blueprint(equipamentos_bp)
app.register_blueprint(categorias_bp)
app.register_blueprint(solicitantes_bp)
app.register_blueprint(emprestimos_bp)
app.register_blueprint(reservas_bp)
app.register_blueprint(manutencoes_bp)
app.register_blueprint(historico_bp)
app.register_blueprint(auth_bp)

@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "projeto": "ELO Campus",
        "mensagem": "Backend iniciado com sucesso!"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "sistema": "ELO Campus"
    })


if __name__ == "__main__":
    app.run(debug=True)
