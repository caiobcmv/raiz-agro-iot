from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src import config
from src.api.deps_auth import ADMIN, PRODUTOR_EXPORTADOR, require_role
from src.api.routers import (alertas, alertas_preditivos, auditoria, auth, clima,
                             config_parametros, dados_mercado, dashboard, frutas, ia,
                             leituras, leituras_rejeitadas, lotes, perfis, preferencias,
                             previsoes, previsoes_ia, recomendacoes, relatorios,
                             relatorios_gerados, risco, sensor_leituras, sensores,
                             usuarios, viagens)

admin = [Depends(require_role(ADMIN))]
produtor = [Depends(require_role(PRODUTOR_EXPORTADOR, ADMIN))]  # já inclui o Admin

app = FastAPI(title="API - Dashboard Climático e Logístico")

@app.get("/", include_in_schema=False)
def raiz():
    return {"status": "ok", "docs": "/docs"}

@app.get("/api/diag", include_in_schema=False)
def diag():
    import traceback
    try:
        from src import database
        conn = database.conectar()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            v = cur.fetchone()[0]
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            tables = [r[0] for r in cur.fetchall()]
        conn.close()
        return {"status": "connected", "select_1": v, "tables": tables}
    except Exception as e:
        return {"status": "db_error", "error": str(e), "traceback": traceback.format_exc()}

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# público (login, refresh, 2FA e sincronização de preferências por usuário)
app.include_router(auth.router)
app.include_router(preferencias.router)

# só Administrador
for r in (perfis, usuarios):
    app.include_router(r.router, dependencies=admin)

# Produtor/Exportador (e Admin)
for r in (leituras, leituras_rejeitadas, auditoria, clima, sensores, config_parametros,
          dashboard, sensor_leituras, lotes, alertas, frutas, dados_mercado,
          relatorios, relatorios_gerados, viagens, risco,
          previsoes, alertas_preditivos, ia, recomendacoes, previsoes_ia):
    app.include_router(r.router, dependencies=produtor)