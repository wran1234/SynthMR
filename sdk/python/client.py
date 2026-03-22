from __future__ import annotations

from typing import Any, Dict, Optional
import requests


class SynthmrClient:
    def __init__(self, base_url: str, api_key: str, timeout: int = 30) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        resp = requests.request(method, url, headers=headers, json=payload, timeout=self.timeout)
        try:
            data = resp.json()
        except Exception:
            data = {"error": f"HTTP {resp.status_code}", "raw": resp.text}
        if not resp.ok:
            raise RuntimeError(data.get("error", f"HTTP {resp.status_code}"))
        return data

    def create_study(
        self,
        idea_text: str,
        geography: str = "US",
        industry: Optional[str] = None,
        price_points: Optional[list[float]] = None,
        target_audience: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return self._request(
            "POST",
            "/api/v1/studies",
            {
                "ideaText": idea_text,
                "geography": geography,
                "industry": industry,
                "pricePoints": price_points or [19, 39, 79],
                "targetAudience": target_audience,
            },
        )

    def start_run(
        self,
        study_id: str,
        sample_size: int = 250,
        population_mode: Optional[str] = None,
        population_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"sampleSize": sample_size}
        if population_mode:
            payload["populationMode"] = population_mode
        if population_size is not None:
            payload["populationSize"] = population_size
        return self._request("POST", f"/api/v1/studies/{study_id}/runs", payload)

    def get_run(self, run_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/v1/runs/{run_id}")

    def get_results(self, run_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/v1/runs/{run_id}/results")

    def chat_run(self, run_id: str, message: str) -> Dict[str, Any]:
        return self._request("POST", f"/api/v1/runs/{run_id}/chat", {"message": message})
