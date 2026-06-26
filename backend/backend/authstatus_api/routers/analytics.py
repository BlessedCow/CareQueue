from __future__ import annotations

from fastapi import APIRouter

from authstatus_api.repository import get_analytics_summary
from authstatus_api.schemas import AnalyticsSummaryResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def read_analytics_summary() -> AnalyticsSummaryResponse:
    return AnalyticsSummaryResponse(**get_analytics_summary())