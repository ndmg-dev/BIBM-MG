from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict
from src.ingestion.parser import parse_dre_excel
from src.models.schemas import DreRecord, KpiCard, DreNode, KpiComparison, ChartSeriesPoint, CompositionPoint
from src.services import kpi_service
import os
import shutil
from supabase import create_client, Client

router = APIRouter()

# Setup config
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client | None = create_client(url, key) if url and key else None

@router.post("/imports/dre", summary="Upload and parse D.R.E. Excel")
async def upload_dre(file: UploadFile = File(...)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are allowed.")
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase não configurado no .env")
        
    temp_path = f"tmp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Mocking or simulating finding the default company (needed for Foreign Key in DB)
        # Assuming we insert Casa Brasilis Marine automatically if not exists or ignore for MVP insert testing
        # To avoid DB constraint error with company_id right now, we will just send period and values,
        # but wait, the dre_records schema requires an import_id or we can leave company_id missing if it's optional?
        # Let's check schema: import_id and company_id are references but can be null if not marked NOT NULL.
        # Looking at schema: company_id UUID REFERENCES companies(id). It is nullable!
        
        # 1. Parse using Pandas
        df = parse_dre_excel(temp_path)
        
        # 2. Convert to Pydantic schemas for validation
        records = [DreRecord(**row) for row in df.to_dict('records')]
        
        # 3. Clean up records for insertion (exclude nested objects or default values that aren't in table)
        data_to_insert = []
        for r in records:
            d = r.model_dump()
            data_to_insert.append(d)
        
        # 4. Insert to Supabase DB!
        response = supabase.table('dre_records').insert(data_to_insert).execute()
        
        os.remove(temp_path)
        
        return {
            "message": "Planilha processada e salva no Supabase com sucesso!", 
            "total_records_saved": len(data_to_insert),
            "preview": data_to_insert[:5]
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kpis", response_model=List[KpiCard], summary="Get Top KPIs")
def get_kpis(period: str = "01/2026"):
    res = supabase.table('dre_records').select('*').eq('period', period).execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.calculate_kpis(records)

@router.get("/kpis/comparison", response_model=List[KpiComparison], summary="Compare two periods")
def get_kpis_comparison(target_period: str, base_period: str):
    res_target = supabase.table('dre_records').select('*').eq('period', target_period).execute()
    res_base = supabase.table('dre_records').select('*').eq('period', base_period).execute()
    
    records_target = [DreRecord(**r) for r in res_target.data] if res_target.data else []
    records_base = [DreRecord(**r) for r in res_base.data] if res_base.data else []
    
    return kpi_service.calculate_comparison(records_target, records_base)

@router.get("/charts/evolution", response_model=List[ChartSeriesPoint], summary="Monthly evolution chart")
def get_evolution_chart(limit: int = 12):
    # For MVP, fetching all periods. In production, we'd limit/filter periods.
    res = supabase.table('dre_records').select('*').execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.build_evolution_series(records)

@router.get("/charts/composition", response_model=List[CompositionPoint], summary="Costs composition chart")
def get_composition_chart(period: str):
    res = supabase.table('dre_records').select('*').eq('period', period).execute()
    if not res.data:
        return []
    records = [DreRecord(**r) for r in res.data]
    return kpi_service.build_composition(records)

@router.get("/dre", response_model=List[DreNode], summary="Get Hierarchical D.R.E.")
def get_dre_tree(period: str = "01/2026"):
    # Busca real no banco
    res = supabase.table('dre_records').select('*').eq('period', period).execute()
    records = res.data
    
    # Constrói a árvore de dependências contábeis baseada no parentescos extraídos
    items = { 
        r['account_name']: DreNode(
            account_name=r['account_name'], 
            value=float(r['value']), 
            percentage=float(r['percentage']), 
            children=[]
        ) for r in records 
    }
    
    tree = []
    # Usado para manter a ordem intacta original, mas organizando pais e filhos
    for r in records:
        node = items[r['account_name']]
        parent = r['parent_name']
        if parent and parent in items:
            items[parent].children.append(node)
        elif not parent:
            tree.append(node)
            
    return tree
