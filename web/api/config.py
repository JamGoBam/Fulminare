"""Centralized config for the local Ollama inference server."""
from __future__ import annotations

import os

OLLAMA_URL     = os.getenv("OLLAMA_URL",     "http://localhost:11434/v1")
OLLAMA_MODEL   = os.getenv("OLLAMA_MODEL",   "qwen2.5:7b-instruct")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))
