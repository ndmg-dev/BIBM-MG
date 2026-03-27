# Documentação Técnica e de Desenvolvimento

## 1. Visão Arquitetural
A plataforma **DASH_BMMG** é projetada sobre uma *stack* analítico-moderna fragmentada em contêineres Docker independentes para orquestração facilitada em plataformas como Coolify.

**Módulos Core:**
1. **Frontend (`Next.js App Router v15`):** Hospeda os componentes React 19 (Server e Client-side), consumindo lógica de SearchParams para roteamento e persistência de filtros, juntamente da Suíte visual contendo Recharts e Tailwind CSS V4 puro.
2. **Backend (`FastAPI v0.100+`):** Micro serviço RESTFul responsável pela digestão pesada da massa bruta em Excel da DRE e o expurgo do formato estruturado e vetorial. Emprega a livraria `Pandas` agressivamente no motor interno de conversível ETL.
3. **Database (`Supabase PostgreSQL`):** Datalake e provedor de Autenticação Edge (Supabase-Go).

## 2. O Motor "ETL" e a Modelagem Hierárquica Pydantic
O desafio principal reside na extração dos títulos da "DRE.xlsx". O analógico original usa estritamente indentações (Espaços) na mesma célula do excel para definir a árvore financeira (se `ICMS` é filho de `Deduções`).
No Backend (`src/ingestion/parser.py`), ocorre a inferência recursiva:
- Múltiplas colunas indexadas dinamicamente representam cada "Mês". O motor detecta qualquer coluna não identificada como "título", separando o target `value/period` atrelado e transformando em long-format tables no Datalake via Upsert Supabase `dre_records`, indexando via coluna "period" e "account_name" como Key Unicidade Opcional.

**Consultas O(1) de Custo Comparativo:** 
Através do `kpi_service.py`, requisita-se ao banco somente os dois arrays de dados relativos aos `start_period` e `target_period`. As Variações Delta (`(Alvo - Base) / Base`) ocorrem na computação da RAM da VM do FastApi, despachando diretamente métricas formatadas consumidas pela UI limpa do Next.

## 3. Google Workspace Identity (SSO Integration Guide)
Para autenticar o fluxo via `@mendoncagalvao.com.br`, as etapas de infraestrutura mandatatórias são:

### 3.1. Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com).
2. Crie um projeto em Nuvem, e habilite a "OAuth Consent Screen". Certifique-se de ser Oauth Interno (restringe ao seu Google Workspace), caso contrário coloque Extendido com Filtro.
3. Obtenha as credenciais `Client ID` e `Client Secret`.
4. Defina a **Authorized redirect URIs** copiando exatamente o link da rota de callback do Supabase API. Ex: `https://seu-id.supabase.co/auth/v1/callback`

### 3.2. Supabase Dashboard
1. Navegue à aba *Authentication* -> *Providers* -> Habilite **Google**.
2. Cole as credenciais extraídas no GCP.
3. Navegue à aba *Database* e defina um *Postgres Trigger* de Segurança para travar domínios invasores via SQL (Executar este script no SQL Editor):
```sql
CREATE OR REPLACE FUNCTION public.check_user_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF split_part(new.email, '@', 2) != 'mendoncagalvao.com.br' THEN
    RAISE EXCEPTION 'Acesso restrito apenas para e-mails institucionais Mendonça Galvão Contadores Associados.';
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER block_invalid_gmail_domains
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_domain();
```
*Note que se as chaves da conta de serviço estiverem rodando o Supabase em self-hosting via Coolify, você inserirá as keys no Kong-Gate API ou no Auth Container.*
