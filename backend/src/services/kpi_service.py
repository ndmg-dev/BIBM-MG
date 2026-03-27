from typing import List, Dict
from src.models.schemas import DreRecord, KpiCard, KpiComparison, ChartSeriesPoint, CompositionPoint

def _extract_metric(records: List[DreRecord], account_name: str) -> float:
    for r in records:
        if r.account_name == account_name:
            return r.value
    return 0.0

def calculate_kpis(records: List[DreRecord]) -> List[KpiCard]:
    faturamento = _extract_metric(records, "RECEITA BRUTA")
    lucro = _extract_metric(records, "LUCRO/PREJUÍZO:")
    custos = _extract_metric(records, "CUSTOS DOS PRODUTOS VENDIDOS")
    receita_liq = _extract_metric(records, "RECEITA LÍQUIDA")
    
    return [
        KpiCard(title="Faturamento Bruto", value=faturamento, trend_percentage=0.0, description="Total faturado no período"),
        KpiCard(title="Receita Líquida", value=receita_liq, trend_percentage=0.0, description="Após deduções de impostos"),
        KpiCard(title="Custos (CPV)", value=custos, trend_percentage=0.0, description="Custo de produto vendido"),
        KpiCard(title="Lucro Líquido", value=lucro, trend_percentage=0.0, description="Bottom line final")
    ]

def calculate_comparison(target_records: List[DreRecord], base_records: List[DreRecord]) -> List[KpiComparison]:
    metrics = ["RECEITA BRUTA", "RECEITA LÍQUIDA", "CUSTOS DOS PRODUTOS VENDIDOS", "LUCRO/PREJUÍZO:"]
    display_names = ["Faturamento Bruto", "Receita Líquida", "Custos (CPV)", "Lucro Líquido"]
    
    comparisons = []
    for idx, metric in enumerate(metrics):
        target_val = _extract_metric(target_records, metric)
        base_val = _extract_metric(base_records, metric)
        
        delta_abs = target_val - base_val
        # Prevent division by zero
        delta_pct = (delta_abs / abs(base_val) * 100) if base_val != 0 else 0.0
        
        comparisons.append(KpiComparison(
            title=display_names[idx],
            target_value=target_val,
            base_value=base_val,
            delta_absolute=delta_abs,
            delta_percentage=round(delta_pct, 2)
        ))
    return comparisons

def build_evolution_series(records: List[DreRecord]) -> List[ChartSeriesPoint]:
    # Group by period
    grouped: Dict[str, List[DreRecord]] = {}
    for r in records:
        grouped.setdefault(r.period, []).append(r)
        
    series = []
    # Sort strictly by string or better logic if available
    periods = sorted(grouped.keys()) 
    for p in periods:
        g = grouped[p]
        receita = _extract_metric(g, "RECEITA LÍQUIDA")
        custos = _extract_metric(g, "CUSTOS DOS PRODUTOS VENDIDOS")
        lucro = _extract_metric(g, "LUCRO/PREJUÍZO:")
        margem = (lucro / receita * 100) if receita != 0 else 0
        
        # Invert costs to positive for charting intuitively
        series.append(ChartSeriesPoint(
            period=p,
            receita=receita,
            custos=abs(custos),
            margem=round(margem, 2),
            lucro_liquido=lucro
        ))
    return series

def build_composition(records: List[DreRecord]) -> List[CompositionPoint]:
    # Peso das deduções vs CPV
    icms = abs(_extract_metric(records, "ICMS"))
    pis = abs(_extract_metric(records, "PIS"))
    cofins = abs(_extract_metric(records, "COFINS"))
    cpv = abs(_extract_metric(records, "CUSTOS DOS PRODUTOS VENDIDOS"))
    
    total = icms + pis + cofins + cpv
    if total == 0: return []
    
    return [
        CompositionPoint(name="ICMS", value=icms, percentage=round((icms/total)*100, 2)),
        CompositionPoint(name="PIS", value=pis, percentage=round((pis/total)*100, 2)),
        CompositionPoint(name="COFINS", value=cofins, percentage=round((cofins/total)*100, 2)),
        CompositionPoint(name="Custo Produto Vendido", value=cpv, percentage=round((cpv/total)*100, 2))
    ]
