import os
from dotenv import load_dotenv

load_dotenv(override=True)

from src.api.services.llm_client import gerar_json

resposta = gerar_json("Responda somente JSON.", '{"ok": true}')
print(resposta)