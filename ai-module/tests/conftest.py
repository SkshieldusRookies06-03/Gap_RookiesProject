"""AI 판정 테스트 공용 (오너: 기술 리드). 키 없이 돈다 — LLM_PROVIDER=fake · 임시 벡터 폴더."""
import os
import tempfile

os.environ.setdefault("AI_INTERNAL_TOKEN", "test-token")
os.environ.setdefault("LLM_PROVIDER", "fake")
os.environ["CHROMA_DIR"] = tempfile.mkdtemp(prefix="jobgap-vec-")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

TOKEN = {"X-Internal-Token": "test-token"}


@pytest.fixture(scope="session")
def client():
    from app.main import app
    return TestClient(app)
