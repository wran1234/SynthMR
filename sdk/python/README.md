# SynthMR Python SDK (Starter)

Lightweight Python client for SynthMR Agent API.

## Install

```bash
pip install requests
```

Copy `client.py` into your project and import `SynthmrClient`.

## Usage

```python
from client import SynthmrClient

client = SynthmrClient(
    base_url="https://your-synthmr-domain.com",
    api_key="smk_your_api_key",
)

study = client.create_study(
    idea_text="AI pricing copilot for indie SaaS",
    geography="US",
    industry="SaaS",
    price_points=[19, 39, 79],
)

run = client.start_run(study["study"]["id"], sample_size=250)
run_id = run["run"]["id"]

status = client.get_run(run_id)
results = client.get_results(run_id)
chat = client.chat_run(run_id, "What price should we test first?")
```
