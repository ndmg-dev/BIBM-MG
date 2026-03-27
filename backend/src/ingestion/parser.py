import pandas as pd
import math
import re

def parse_dre_excel(file_path: str):
    """"
    Lê a planilha de D.R.E, infere hierarquias a partir da indentação,
    e extrai os meses, valores e porcentagens em formato tabular limpo (melted).
    """
    # A DRE da Marine pula as primeiras linhas de metadados corporativos
    # A linha que contem os periodos (01/2026, 02/2026) fica efetivamente no skiprows 7
    df = pd.read_excel(file_path, sheet_name=0, skiprows=7)
    
    # As colunas originais do DataFrame após skiprows.
    columns = list(df.columns)
    
    # Localizar os períodos dinamicamente analisando os headers das colunas
    period_columns = []
    
    for i in range(1, len(columns)): 
        col_name = str(columns[i]).strip()
        # Filtra "Unnamed", e a própria "%" para encontrar as cabeças de período
        if col_name and not col_name.startswith("Unnamed") and not col_name.startswith("%"):
            period_name = col_name
            val_index = i
            
            # Buscar a próxima coluna de '%' que pertence a este período
            pct_index = None
            for j in range(i+1, min(i+4, len(columns))):
                if str(columns[j]).strip().startswith("%"):
                    pct_index = j
                    break
            
            period_columns.append({
                "period": period_name,
                "value_col_index": val_index,
                "pct_col_index": pct_index
            })
            
    # Variáveis de parse de hierarquia
    parsed_data = []
    
    # A matriz de parentescos trackeia a última conta vista em cada nível
    # para podermos assinalar o "parent_id" correto para contas filhas.
    # Assumimos que cada 5 espaços equivale a +1 level de indentação?
    # Analisando a inspeção: "RECEITA BRUTA" -> 0 espaços
    # "     VENDA DE MERCADORIAS" -> 5 espaços
    # Vamos contar espaços literais
    
    current_parents = {}
    last_level = -1
    last_account_name = None
    
    for _, row in df.iterrows():
        raw_account = str(row.iloc[0])
        if raw_account == "nan" or raw_account.strip() == "":
            continue # Pula linhas em branco
            
        # Calcula nível de indentação
        space_count = len(raw_account) - len(raw_account.lstrip(' '))
        
        # Limpa o nome da conta e retira prefixos contábeis sujos tipo "(-) "
        clean_name = raw_account.strip()
        account_type = "RECEITA" # default type
        
        # Simple heuristic to determine type
        if "(-) " in clean_name or "CUSTOS" in clean_name.upper():
            if "CUSTOS" in clean_name.upper():
                account_type = "CUSTOS"
            else:
                account_type = "DEDUÇÕES"
        elif "LUCRO" in clean_name.upper() or "RESULTADO" in clean_name.upper():
            account_type = "RESULTADO_TOTALIZADOR"
        
        # Remove "(-) " prefix for clean DB storage
        clean_name = clean_name.replace("(-)", "").strip()
        
        # Level assignment based on spacing rules (if spaces = 0 -> level 0, if 5 -> level 1, etc)
        # However, purely relational is better. Let's just store the exact space count for relative leveling.
        level = space_count // 5
        
        # Encontra o parent. Se a linha atual tiver nível X, seu pai é o cara do nível X-1 gravado em `current_parents`.
        parent_name = None
        if level > 0:
            # Procure o pai no nível logo acima (nível mais próximo que seja menor que 'level')
            for l in range(level - 1, -1, -1):
                if l in current_parents:
                    parent_name = current_parents[l]
                    break
        else:
            parent_name = None
            
        # Update current levels
        current_parents[level] = clean_name
        # Clear deeper levels as we popped back up
        keys_to_remove = [k for k in current_parents.keys() if k > level]
        for k in keys_to_remove:
            del current_parents[k]
        
        # Iterate periods and build records
        for p in period_columns:
            period = p["period"]
            val_col = p["value_col_index"]
            pct_col = p["pct_col_index"]
            
            raw_val = row.iloc[val_col]
            raw_pct = row.iloc[pct_col] if pct_col is not None else 0
            
            # Limpeza de numéricos (pode vir NaN do pandas)
            val = float(raw_val) if not pd.isna(raw_val) else 0.0
            pct = float(raw_pct) if not pd.isna(raw_pct) else 0.0
            
            parsed_data.append({
                "period": period,
                "account_name": clean_name,
                "account_raw": raw_account,
                "account_level": level,
                "parent_name": parent_name,
                "account_type": account_type,
                "value": val,
                "percentage": pct
            })

    return pd.DataFrame(parsed_data)


if __name__ == "__main__":
    import json
    # Run locally against the provided excel
    test_file = r"c:\Users\User\Documents\python_level_hard\(B.I) DASH_BMMG\D. R. E. 2026 - MARINE.xlsx"
    df = parse_dre_excel(test_file)
    print(f"Parsed {len(df)} records.")
    
    # Summary to verify numbers
    sample = df[df['period'] == '01/2026']
    print("\nSAMPLE ACCOUNTS FOR 01/2026:")
    print(sample[['account_name', 'account_level', 'parent_name', 'value']].head(10).to_string(index=False))
    
    # Save a JSON snapshot just in case
    df.to_json("parsed_dre_test.json", orient="records", force_ascii=False, indent=2)
    print("\nSaved parsed array to parsed_dre_test.json")
