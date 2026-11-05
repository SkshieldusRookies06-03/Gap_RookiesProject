"""SPEC §6 요청 모양 = 계약 (오너: AI). 필드 이름을 바꾸려면 SPEC부터."""
from typing import Literal

from pydantic import BaseModel, Field


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
