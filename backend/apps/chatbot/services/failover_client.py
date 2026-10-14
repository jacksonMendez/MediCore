"""
MediCore OS — Multi-Level LLM Failover Client with Circuit Breaker
Enforces 100% free-tier models with zero hallucinated error messages.
"""

import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx
from django.conf import settings
from groq import Groq

logger = logging.getLogger(__name__)


class ModelCircuitBreaker:
    """Tracks temporarily rate-limited models and handles automatic recovery."""
    _blocked_until: Dict[str, float] = {}

    @classmethod
    def is_available(cls, model_key: str) -> bool:
        unblock_time = cls._blocked_until.get(model_key, 0.0)
        return time.time() >= unblock_time

    @classmethod
    def block_model(cls, model_key: str, duration_seconds: float = 60.0):
        cls._blocked_until[model_key] = time.time() + duration_seconds
        logger.warning(
            f"[CircuitBreaker] Modelo '{model_key}' bloqueado por {duration_seconds:.1f}s "
            f"hasta {time.strftime('%H:%M:%S', time.localtime(cls._blocked_until[model_key]))}"
        )

    @classmethod
    def get_remaining_block(cls, model_key: str) -> float:
        return max(0.0, cls._blocked_until.get(model_key, 0.0) - time.time())


class UnifiedLLMClient:
    """
    Executes chat completions with automatic multi-level failover.
    Chain order:
    1. Groq: qwen/qwen3.8-27b
    2. Groq: openai/gpt-oss-120b
    3. Groq: openai/gpt-oss-20b
    4. Google Gemini: gemini-flash-latest (100% free tier)
    5. OpenRouter: nex-agi/nex-n2.5-pro:free (Strictly :free)
    6. OpenRouter: deepseek/deepseek-v4-flash-0731:free (Strictly :free)
    """

    def __init__(self):
        self.groq_api_key = getattr(settings, 'GROQ_API_KEY', '') or os.getenv('GROQ_API_KEY', '')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY', '')
        self.cerebras_api_key = os.getenv('CEREBRAS_API_KEY', '')
        self.openrouter_api_key = os.getenv('OPENROUTER_API_KEY', '')

        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None
        self.http_client = httpx.Client(timeout=30.0)

    def _parse_groq_retry_seconds(self, err_msg: str) -> float:
        """Extracts exact wait duration from Groq 429 message (e.g. 'Please try again in 11m50.2s')."""
        match = re.search(r'try again in (?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?', err_msg, re.I)
        if match:
            minutes = float(match.group(1) or 0)
            seconds = float(match.group(2) or 0)
            total = (minutes * 60.0) + seconds
            if total > 0:
                return total + 2.0  # buffer
        if "tpd" in err_msg.lower() or "day" in err_msg.lower():
            return 900.0  # 15 minutes default for daily limit
        return 60.0  # 60s for RPM/TPM

    def _call_groq(self, model_id: str, messages: List[Dict], tools: List[Dict], temperature: float = 0.0, max_tokens: int = 350) -> Any:
        if not self.groq_client:
            raise RuntimeError("GROQ_API_KEY no configurada")
        kwargs = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        return self.groq_client.chat.completions.create(**kwargs)

    def _call_gemini(self, model_id: str, messages: List[Dict], tools: List[Dict], temperature: float = 0.0, max_tokens: int = 350) -> Any:
        if not self.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY no configurada")
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.gemini_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        res = self.http_client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            raise RuntimeError(f"Gemini HTTP {res.status_code}: {res.text[:200]}")
        return self._wrap_openai_compatible_response(res.json())

    def _call_openrouter_free(self, model_id: str, messages: List[Dict], tools: List[Dict], temperature: float = 0.0, max_tokens: int = 350) -> Any:
        if not self.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY no configurada")
        # STRICT SAFETY: Never call a paid model on OpenRouter!
        if not model_id.endswith(":free"):
            raise ValueError(f"SEGURIDAD: El modelo OpenRouter '{model_id}' NO tiene el sufijo ':free'. Operación cancelada.")

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://medicore.local",
            "X-Title": "MediCore OS",
        }
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        res = self.http_client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            raise RuntimeError(f"OpenRouter HTTP {res.status_code}: {res.text[:200]}")
        return self._wrap_openai_compatible_response(res.json())

    def _wrap_openai_compatible_response(self, raw_json: dict) -> Any:
        """Converts raw json into an object resembling Groq/OpenAI response message."""
        class ToolCallFunc:
            def __init__(self, name, arguments):
                self.name = name
                self.arguments = arguments if isinstance(arguments, str) else json.dumps(arguments)

        class ToolCall:
            def __init__(self, tc_id, func_name, func_args):
                self.id = tc_id
                self.type = "function"
                self.function = ToolCallFunc(func_name, func_args)

        class ResponseMessage:
            def __init__(self, content, tool_calls):
                self.content = content
                self.tool_calls = tool_calls

        class Choice:
            def __init__(self, message):
                self.message = message

        class WrappedResponse:
            def __init__(self, choices):
                self.choices = choices

        first_choice = raw_json.get("choices", [{}])[0]
        msg_dict = first_choice.get("message", {})
        content = msg_dict.get("content") or ""

        tool_calls_raw = msg_dict.get("tool_calls") or []
        parsed_tool_calls = []
        for tc in tool_calls_raw:
            tc_id = tc.get("id") or f"call_{int(time.time()*1000)}"
            fn = tc.get("function", {})
            name = fn.get("name", "")
            args = fn.get("arguments", "{}")
            parsed_tool_calls.append(ToolCall(tc_id, name, args))

        msg_obj = ResponseMessage(content, parsed_tool_calls if parsed_tool_calls else None)
        return WrappedResponse([Choice(msg_obj)])

    def create_completion(
        self,
        messages: List[Dict],
        tools: List[Dict],
        temperature: float = 0.0,
        max_tokens: int = 350,
    ) -> Tuple[Any, str, str, bool]:
        """
        Attempts execution across the failover chain.
        Returns: (response, provider_name, model_name, is_fallback)
        Raises: RuntimeError if all providers fail.
        """
        # Strict hierarchy of verified working models:
        chain = [
            ("groq", "qwen/qwen3.8-27b", self._call_groq),
            ("groq", "openai/gpt-oss-120b", self._call_groq),
            ("groq", "openai/gpt-oss-20b", self._call_groq),
            ("openrouter", "nvidia/nemotron-3.5-lightning:free", self._call_openrouter_free),
            ("openrouter", "liquid/lfm-2.5-2.6b:free", self._call_openrouter_free),
            ("openrouter", "thinkingmachines/inkling:free", self._call_openrouter_free),
        ]

        errors = []
        for idx, (provider, model_name, call_fn) in enumerate(chain):
            model_key = f"{provider}:{model_name}"
            if not ModelCircuitBreaker.is_available(model_key):
                rem = ModelCircuitBreaker.get_remaining_block(model_key)
                logger.info(f"[LLM Failover] Saltando '{model_key}' (bloqueado por {rem:.1f}s más)")
                continue

            is_fallback = idx > 0
            try:
                logger.info(f"[LLM Failover] Intentando con {provider.upper()} ({model_name}) | Fallback={is_fallback}")
                response = call_fn(model_name, messages, tools, temperature, max_tokens)
                logger.info(f"[LLM Failover] ÉXITO con {provider.upper()} ({model_name}) | Fallback={is_fallback}")
                return response, provider, model_name, is_fallback
            except Exception as e:
                err_str = str(e)
                logger.warning(f"[LLM Failover] Error en {model_key}: {err_str[:150]}")
                errors.append(f"{model_key}: {err_str[:100]}")

                # If rate limited (429), block in circuit breaker
                if "429" in err_str or "rate limit" in err_str.lower():
                    wait_s = self._parse_groq_retry_seconds(err_str) if provider == "groq" else 60.0
                    ModelCircuitBreaker.block_model(model_key, wait_s)
                elif "503" in err_str or "high demand" in err_str.lower():
                    ModelCircuitBreaker.block_model(model_key, 30.0)

        # All providers failed
        error_summary = " | ".join(errors)
        logger.error(f"[LLM Failover] Fallaron TODOS los proveedores: {error_summary}")
        raise RuntimeError("Todos los proveedores de LLM no están disponibles actualmente.")
