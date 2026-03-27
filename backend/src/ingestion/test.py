import pandas as pd
test_file = r"c:\Users\User\Documents\python_level_hard\(B.I) DASH_BMMG\D. R. E. 2026 - MARINE.xlsx"

for skip in [5, 6, 7]:
    df = pd.read_excel(test_file, sheet_name=0, skiprows=skip)
    print(f"\n--- SKIPROWS {skip} ---")
    print(list(df.columns))
    print(df.head(2).to_string())
