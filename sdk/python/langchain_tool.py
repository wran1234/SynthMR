from __future__ import annotations

from typing import Any, Dict
from .client import SynthmrClient


def create_synthmr_tools(client: SynthmrClient) -> Dict[str, Any]:
    return {
        "name": "synthmr_tools",
        "description": "Tool-compatible wrappers for SynthMR Agent API",
        "create_study": lambda idea_text, geography, industry, price_points: client.create_study(
            idea_text=idea_text,
            geography=geography,
            industry=industry,
            price_points=price_points,
        ),
        "start_run": lambda study_id, sample_size=250: client.start_run(
            study_id=study_id,
            sample_size=sample_size,
        ),
        "get_results": lambda run_id: client.get_results(run_id),
        "chat_run": lambda run_id, message: client.chat_run(run_id, message),
    }
