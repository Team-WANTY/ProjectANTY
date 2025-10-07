from pydantic import BaseModel, UUID4
from typing import Literal

class AnalyticVisualization(BaseModel):
    type: Literal["bar", "line", "pie", "number", "heatmap"]
    label: str
    description: str

class Analytic(BaseModel):
    id: UUID4
    query_function: str  # a callable string like "analytics.tasks_completed"
    visualization: AnalyticVisualization
