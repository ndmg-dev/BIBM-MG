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

        if df.empty:
            raise HTTPException(status_code=422, detail="Nenhum registro de DRE foi encontrado no arquivo. Verifique o padrão da planilha.")

        # Criar histórico de importação
        import_res = supabase.table('imports_history').insert({
            "company_id": company_id,
            "file_name": file.filename,
            "status": "SUCCESS"
        }).execute()
        import_id = import_res.data[0]['id']

        data_to_insert = []
        for row in df.to_dict('records'):
            row['company_id'] = company_id
            row['import_id'] = import_id
            data_to_insert.append(row)

        supabase.table('dre_records').insert(data_to_insert).execute()
        os.remove(temp_path)

        return {
            "message": f"Planilha de '{company_name}' importada com sucesso!",
            "company_id": company_id,
            "import_id": import_id,
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


@router.get("/periods", response_model=List[str], summary="Períodos disponíveis para uma empresa")
def list_periods(company_id: str = ""):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase não configurado")
    query = supabase.table('dre_records').select('period')
    if company_id:
        query = query.eq('company_id', company_id)
    res = query.execute()
    # Retorna períodos únicos, ordenados cronologicamente
    periods = sorted(
        set(r['period'] for r in (res.data or []) if r.get('period')),
        key=lambda p: (
            # Ordena "MM/YYYY" como (YYYY, MM); fallback para string
            (int(p.split('/')[1]), int(p.split('/')[0]))
            if '/' in p and len(p.split('/')) == 2 and p.split('/')[0].isdigit() and p.split('/')[1].isdigit()
            else (9999, 99)
        )
    )
    return periods



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
def get_dre_tree(target_period: str = "01/2026", base_period: str = "02/2026", company_id: str = ""):
    target_periods = [p.strip() for p in target_period.split(',')]
    q_target = supabase.table('dre_records').select('*').in_('period', target_periods)
    if company_id: q_target = q_target.eq('company_id', company_id)
    res_target = q_target.execute()

    base_periods = [p.strip() for p in base_period.split(',')]
    q_base = supabase.table('dre_records').select('*').in_('period', base_periods)
    if company_id: q_base = q_base.eq('company_id', company_id)
    res_base = q_base.execute()

    def aggregate_records(records):
        agg = {}
        for r in records:
            name = r['account_name']
            if name not in agg:
                agg[name] = r.copy()
                agg[name]['value'] = 0.0
            agg[name]['value'] += float(r['value'])
        receita_liquida = agg.get('RECEITA LÍQUIDA', {}).get('value', 0.0)
        for name in agg:
            val = agg[name]['value']
            agg[name]['percentage'] = (val / receita_liquida * 100) if receita_liquida != 0 else 0.0
        return agg

    agg_target = aggregate_records(res_target.data or [])
    agg_base = aggregate_records(res_base.data or [])

    base_structure = res_target.data or res_base.data or []
    ordered_accounts = []
    seen = set()
    for r in base_structure:
        if r['account_name'] not in seen:
            seen.add(r['account_name'])
            ordered_accounts.append(r)

    items = {}
    for r in ordered_accounts:
        name = r['account_name']
        t_val = agg_target.get(name, {}).get('value', 0.0)
        t_pct = agg_target.get(name, {}).get('percentage', 0.0)
        b_val = agg_base.get(name, {}).get('value', 0.0)
        b_pct = agg_base.get(name, {}).get('percentage', 0.0)
        
        ah = 0.0
        if b_val != 0:
            ah = ((t_val / b_val) - 1) * 100
            
        items[name] = DreNode(
            account_name=name,
            value=t_val,
            percentage=t_pct,
            base_value=b_val,
            base_percentage=b_pct,
            ah_percentage=ah,
            children=[]
        )

    tree = []
    for r in ordered_accounts:
        name = r['account_name']
        node = items[name]
        parent = r.get('parent_name')
        if parent and parent in items:
            items[parent].children.append(node)
        elif not parent:
            tree.append(node)

    return tree
