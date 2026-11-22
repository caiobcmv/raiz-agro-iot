import json
import os
import time

import requests

# Erros que valem uma nova tentativa (instabilidade passageira, não erro de chave/modelo/prompt)
_STATUS_REPETIVEIS = {429, 500, 502, 503, 504}


class LLMError(Exception):
    pass


def _env_float(nome: str, padrao: float) -> float:
    try:
        return max(1.0, float(os.environ.get(nome, str(padrao))))
    except ValueError:
        return padrao


def _env_int(nome: str, padrao: int) -> int:
    try:
        return max(1, int(os.environ.get(nome, str(padrao))))
    except ValueError:
        return padrao


def _timeout() -> float:
    return _env_float("LLM_TIMEOUT_S", 90.0)


def _limpar_json(texto: str) -> dict:
    texto = texto.strip()
    if texto.startswith("```"):
        texto = texto.strip("`")
        if texto.lower().startswith("json"):
            texto = texto[4:]
    try:
        return json.loads(texto)
    except json.JSONDecodeError as e:
        raise LLMError(f"Resposta da IA não é JSON válido: {e}") from e


def _checar_resposta(r: requests.Response, provedor: str) -> None:
    """Como raise_for_status, mas com o motivo que o provedor devolveu (sem expor chaves)."""
    if r.ok:
        return
    detalhe = ""
    try:
        corpo = r.json()
        erro = corpo.get("error", corpo) if isinstance(corpo, dict) else corpo
        detalhe = erro.get("message") if isinstance(erro, dict) else str(erro)
    except ValueError:
        detalhe = r.text[:200]
    raise requests.HTTPError(f"{provedor} respondeu {r.status_code}: {detalhe}".strip(), response=r)


def _gemini(system: str, user: str, model: str) -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise LLMError("GEMINI_API_KEY não encontrada no ambiente.")
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    # a chave vai no header (não na URL), para não aparecer em mensagens de erro/logs
    r = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": key},
        json=body,
        timeout=_timeout(),
    )
    _checar_resposta(r, "Gemini")
    try:
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError("Resposta inesperada do Gemini (sem texto).") from e


def _groq(system: str, user: str, model: str) -> str:
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key:
        raise LLMError("GROQ_API_KEY não encontrada no ambiente.")
    body = {
        "model": model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json=body,
        timeout=_timeout(),
    )
    _checar_resposta(r, "Groq")
    try:
        return r.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError("Resposta inesperada do Groq (sem texto).") from e


def _ollama(system: str, user: str, model: str) -> str:
    base = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    body = {
        "model": model,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    # modelo local costuma ser mais lento: nunca menos de 120 s
    r = requests.post(f"{base}/api/chat", json=body, timeout=max(120.0, _timeout()))
    _checar_resposta(r, "Ollama")
    try:
        return r.json()["message"]["content"]
    except (KeyError, TypeError) as e:
        raise LLMError("Resposta inesperada do Ollama (sem texto).") from e


_PROVEDORES = {"gemini": _gemini, "groq": _groq, "ollama": _ollama}


def _vale_repetir(e: Exception) -> bool:
    if isinstance(e, (requests.Timeout, requests.ConnectionError)):
        return True
    if isinstance(e, requests.HTTPError) and e.response is not None:
        return e.response.status_code in _STATUS_REPETIVEIS
    return False


def _descrever(e: Exception, provedor: str) -> str:
    if isinstance(e, requests.Timeout):
        return f"{provedor} não respondeu em {_timeout():.0f}s (aumente LLM_TIMEOUT_S ou use um modelo mais rápido)"
    if isinstance(e, requests.ConnectionError):
        return f"sem conexão com {provedor}: {e}"
    return str(e)


def gerar_json(system: str, user: str) -> tuple[dict, str]:
    """Chama o provedor configurado e devolve (dict_json, 'provedor:modelo').

    Tenta o modelo principal (LLM_MODEL) e, se ele falhar por instabilidade ou não existir para a
    chave, passa para os de LLM_MODELOS_RESERVA (separados por vírgula).
    Levanta LLMError em qualquer falha (rede, cota, JSON inválido).
    """
    provedor = os.environ.get("LLM_PROVIDER", "gemini").lower().strip()
    if provedor not in _PROVEDORES:
        raise LLMError(f"LLM_PROVIDER inválido: {provedor}")

    principal = (os.environ.get("LLM_MODEL") or "").strip() or (
        "gemini-3.5-flash-lite" if provedor == "gemini" else "")
    if not principal:
        raise LLMError("Defina LLM_MODEL no .env")

    reservas = [m.strip() for m in os.environ.get("LLM_MODELOS_RESERVA", "").split(",") if m.strip()]
    modelos = [principal] + [m for m in reservas if m != principal]

    tentativas = _env_int("LLM_TENTATIVAS", 2)
    espera = _env_float("LLM_ESPERA_S", 3.0)
    ultimo_erro: Exception = LLMError("Nenhuma tentativa foi feita.")

    for model in modelos:
        for n in range(1, tentativas + 1):
            try:
                bruto = _PROVEDORES[provedor](system, user, model)
                return _limpar_json(bruto), f"{provedor}:{model}"
            except LLMError:
                raise                           # chave ausente, resposta inválida: repetir não ajuda
            except Exception as e:
                ultimo_erro = e
                if _vale_repetir(e) and n < tentativas:
                    time.sleep(espera * (2 ** (n - 1)))
                    continue
                break                           # esgotou as tentativas ou erro do modelo (ex.: 404): próximo modelo

    raise LLMError(f"Falha ao chamar {provedor} (modelos tentados: {', '.join(modelos)}): "
                   f"{_descrever(ultimo_erro, provedor)}") from ultimo_erro