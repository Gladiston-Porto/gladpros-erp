import os

files = [
    r"packages/financeiro/src/api/despesas/[id]/aprovar/route.ts",
    r"packages/financeiro/src/api/despesas/[id]/pagar/route.ts",
    r"packages/financeiro/src/api/despesas/[id]/rejeitar/route.ts",
    r"packages/financeiro/src/api/despesas/[id]/route.ts",
    r"packages/financeiro/src/api/despesas/route.ts"
]

base_path = r"c:\Users\gladi\Documents\gladpros-nextjs"

for file_rel in files:
    file_path = os.path.join(base_path, file_rel)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace("nome: true", "nomeCompleto: true")
        
        if content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file_rel}")
        else:
            print(f"No changes in {file_rel}")
            
    except Exception as e:
        print(f"Error processing {file_rel}: {e}")
