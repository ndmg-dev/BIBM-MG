-- SQL Setup Instructions for Supabase Auth (Google Workspace) & RLS

-- 1. Create a trigger to block non-Mendonca Galvao accounts at the DB level
CREATE OR REPLACE FUNCTION public.check_user_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF split_part(new.email, '@', 2) != 'mendoncagalvao.com.br' THEN
    RAISE EXCEPTION 'Acesso negado: Domínio de e-mail não autorizado.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS block_invalid_gmail_domains ON auth.users;

CREATE TRIGGER block_invalid_gmail_domains
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_domain();

-- 2. Restringir Leitura Privada da Tabela de DRE via RLS
-- Apenas usuários autenticados no Supabase poderão ler os dados se consultarem via API Key Pública.
ALTER TABLE dre_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" 
ON dre_records 
FOR SELECT 
TO authenticated 
USING (true);

-- (Opcional) Allow service role full access (FastAPI uses service role to bypass RLS)
CREATE POLICY "Allow service role full access" 
ON dre_records 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
