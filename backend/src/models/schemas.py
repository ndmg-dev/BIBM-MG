from pydantic import BaseModel
from typing import List, Optional

class DreRecord(BaseModel):
    period: str
    account_name: str
    account_raw: str
    account_level: int
    parent_name: Optional[str] = None
    account_type: str
    value: float
    percentage: float

class KpiCard(BaseModel):
    title: str
    value: float
    trend_percentage: float
    description: Optional[str] = None

class DreNode(BaseModel):
    account_name: str
    value: float
    percentage: float
    children: List['DreNode'] = []
    
DreNode.model_rebuild()

class KpiComparison(BaseModel):
    title: str
    target_value: float
    base_value: float
    delta_absolute: float
    delta_percentage: float
    
class ChartSeriesPoint(BaseModel):
    period: str
    receita: float
    custos: float
    margem: float
    lucro_liquido: float

class CompositionPoint(BaseModel):
    name: str
    value: float
    percentage: float
