from __future__ import annotations

from fastapi import APIRouter, Depends

from authstatus_api.authorizations.analytics import get_analytics_summary
from authstatus_api.schemas import AnalyticsSummaryResponse
from authstatus_api.security.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
AnalyticsUser = Depends(get_current_user)


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def read_analytics_summary(
    current_user: dict = AnalyticsUser,
) -> AnalyticsSummaryResponse:
    return AnalyticsSummaryResponse(**get_analytics_summary())
