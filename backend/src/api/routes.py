from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
from src.ingestion.parser import parse_dre_excel
from src.models.schemas import DreRecord, KpiCard, DreNode, KpiComparison, ChartSeriesPoint, CompositionPoint, Company
from src.services import kpi_service
import os
import shutil
from supabase import create_client, Client

router = APIRouter()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client | None = create_client(url, key) if url and key else None


def get_or_create_company(name: str) -> str:
    """Busca empresa pelo nome ou cria uma nova. Retorna o company_id."""
    res = supabase.table('companies').select('id').eq('name', name).limit(1).execute()
    if res.data:
        return res.data[0]['id']
    # Cria nova empresa
    insert_res = supabase.table('companies').insert({"name": name}).execute()
    return insert_res.data[0]['id']


# ─────────────────────────────────────────
# IMPORTAÇÃO
# ─────────────────────────────────────────

@router.post("/imports/dre", summary="Upload e parse da D.R.E. Excel")
async def upload_dre(
    file: UploadFile = File(...),
    company_name: str = Form(...)
):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Apenas arquivos .xlsx são aceitos.")
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase não configurado no .env")

    temp_path = f"tmp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        company_id = get_or_create_company(company_name.strip())
        df = parse_dre_excel(temp_path)

        data_to_insert = []
        for row in df.to_dict('records'):
            row['company_id'] = company_id
            # Remove campos que não existem na tabela
            row.pop('account_raw', None)
            data_to_insert.append(row)

        supabase.table('dre_records').insert(data_to_insert).execute()
        os.remove(temp_path)

        return {
            "message": f"Planilha de '{company_name}' importada com sucesso!",
            "company_id": company_id,
            "total_records_saved": len(data_to_insert),
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# EMPRESAS
# ─────────────────────────────────────────

@router.get("/companies", response_model=List[Company], summary="Lista todas as empresas")
def list_companies():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase não configurado")
    res = supabase.table('companies').select('id, name, cnpj').order('name').execute()
    return res.data or []


# ─────────────────────────────────────────
# KPIs
# ─────────────────────────────────────────

@router.get("/kpis", response_model=List[KpiCard], summary="KPIs do período")
def get_kpis(period: str = "01/2026", company_id: str = ""):
    query = supabase.table('dre_records').select('*').eq('period', period)
    if company_id:
        query = query.eq('company_id', company_id)
    res = query.execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.calculate_kpis(records)


@router.get("/kpis/comparison", response_model=List[KpiComparison], summary="Comparativo entre dois períodos")
def get_kpis_comparison(target_period: str, base_period: str, company_id: str = ""):
    q_target = supabase.table('dre_records').select('*').eq('period', target_period)
    q_base   = supabase.table('dre_records').select('*').eq('period', base_period)
    if company_id:
        q_target = q_target.eq('company_id', company_id)
        q_base   = q_base.eq('company_id', company_id)

    res_target = q_target.execute()
    res_base   = q_base.execute()

    records_target = [DreRecord(**r) for r in res_target.data] if res_target.data else []
    records_base   = [DreRecord(**r) for r in res_base.data]   if res_base.data   else []

    return kpi_service.calculate_comparison(records_target, records_base)


# ─────────────────────────────────────────
# GRÁFICOS
# ─────────────────────────────────────────

@router.get("/charts/evolution", response_model=List[ChartSeriesPoint], summary="Evolução mensal")
def get_evolution_chart(company_id: str = ""):
    query = supabase.table('dre_records').select('*')
    if company_id:
        query = query.eq('company_id', company_id)
    res = query.execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.build_evolution_series(records)


@router.get("/charts/composition", response_model=List[CompositionPoint], summary="Composição de custos")
def get_composition_chart(period: str, company_id: str = ""):
    query = supabase.table('dre_records').select('*').eq('period', period)
    if company_id:
        query = query.eq('company_id', company_id)
    res = query.execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.build_composition(records)


# ─────────────────────────────────────────
# DRE ANALÍTICA
# ─────────────────────────────────────────

@router.get("/dre", response_model=List[DreNode], summary="D.R.E. hierárquica")
def get_dre_tree(period: str = "01/2026", company_id: str = ""):
    query = supabase.table('dre_records').select('*').eq('period', period)
    if company_id:
        query = query.eq('company_id', company_id)
    res = query.execute()
    records = res.data or []

    items = {
        r['account_name']: DreNode(
            account_name=r['account_name'],
            value=float(r['value']),
            percentage=float(r['percentage']),
            children=[]
        ) for r in records
    }

    tree = []
    for r in records:
        node = items[r['account_name']]
        parent = r.get('parent_name')
        if parent and parent in items:
            items[parent].children.append(node)
        elif not parent:
            tree.append(node)

    return tree
