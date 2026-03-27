-- Supabase PostgreSQL Schema for Mendonça Galvão BI

-- 1. Companies / Clients
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Imports History
CREATE TABLE imports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    file_name VARCHAR(255) NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    uploaded_by VARCHAR(255)
);

-- 3. D.R.E. Raw Records
CREATE TABLE dre_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES imports_history(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- e.g., '01/2026'
    account_name VARCHAR(255) NOT NULL,
    account_raw VARCHAR(255),
    account_level INTEGER DEFAULT 0,
    parent_name VARCHAR(255),
    account_type VARCHAR(50),
    value NUMERIC(15, 2) NOT NULL,
    percentage NUMERIC(8, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for fast KPI retrieval
CREATE INDEX idx_dre_period ON dre_records(company_id, period);
CREATE INDEX idx_dre_account ON dre_records(account_name);

-- RLS (Row Level Security) - to restrict access to @mendoncagalvao.com.br
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_records ENABLE ROW LEVEL SECURITY;

-- Example Policy restricting to Mendonca Galvao domain
CREATE POLICY "Strict internal domain access"
ON dre_records
FOR ALL
USING (auth.jwt() ->> 'email' LIKE '%@mendoncagalvao.com.br');
