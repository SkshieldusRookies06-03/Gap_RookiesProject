"""SPEC §6 요청 모양 = 계약 (오너: AI). 필드 이름을 바꾸려면 SPEC부터."""
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class IngestRequest(BaseModel):
    documentId: str = Field(min_length=1)
    ownerUuid: str = Field(min_length=1)
    docType: Literal["JOB_POSTING", "RESUME"]
    title: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1)


class HistoryItem(BaseModel):
    role: Literal["USER", "ASSISTANT"]
    content: str


class AnalyzeRequest(BaseModel):
    ownerUuid: str = Field(min_length=1)
    postingId: str = Field(min_length=1)
    resumeId: str = Field(min_length=1)
    postingTitle: str = ""
    mode: Literal["REPORT", "FOLLOWUP"]
    question: str = Field(default="", max_length=1000)
    history: list[HistoryItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def _followup_needs_question(self):
        # SPEC §4.3 "analysisId가 있으면 question 필수" — 백엔드가 1차로 막지만 내부 계약도 스스로 지킨다
        if self.mode == "FOLLOWUP" and not self.question.strip():
            raise ValueError("FOLLOWUP은 question이 필요합니다")
        return self
