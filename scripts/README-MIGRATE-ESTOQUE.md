# 🚀 EXECUTAR MIGRATIONS DO MÓDULO ESTOQUE

## ⚠️ IMPORTANTE: Leia antes de executar!

Este script é **SEGURO** e faz backup automático antes de qualquer alteração.

---

## 📋 PRÉ-REQUISITOS

1. ✅ **MySQL instalado** e acessível via linha de comando
2. ✅ **PowerShell 5.1+** (já vem no Windows)
3. ✅ **Credenciais do banco de dados**

---

## 🔧 COMO EXECUTAR

### **Opção 1: Configuração Padrão** (localhost, root, sem senha)

```powershell
cd C:\Users\gladi\Documents\gladpros-nextjs
.\scripts\migrate-estoque-safe.ps1
```

### **Opção 2: Com Senha**

```powershell
.\scripts\migrate-estoque-safe.ps1 -DbPassword "sua_senha_aqui"
```

### **Opção 3: Configuração Completa**

```powershell
.\scripts\migrate-estoque-safe.ps1 `
  -DbHost "localhost" `
  -DbUser "root" `
  -DbPassword "sua_senha" `
  -DbName "gladpros"
```

---

## 🔄 O QUE O SCRIPT FAZ

### **Etapa 1: Backup** 📦
- Cria backup completo do banco de dados
- Salva em: `backups/gladpros_backup_YYYYMMDD_HHMMSS.sql`
- Inclui: dados, procedures, triggers, events

### **Etapa 2: Migrations** 🚀
Executa na ordem:
1. `create_estoque_base` (tabelas base)
2. `create_materiais` (sistema de materiais)
3. `create_equipamentos` (sistema de equipamentos)
4. `create_alertas_compras` (alertas e compras)
5. `seed_data` (dados iniciais)
6. `stored_procedures` (funções auxiliares)

### **Etapa 3: Validação** 🔍
- Verifica se todas as tabelas foram criadas
- Valida stored procedures
- Confirma integridade

### **Etapa 4: Resultado** ✅
- Se sucesso: mantém backup e confirma instalação
- Se erro: **PERGUNTA** se quer restaurar o backup automaticamente

---

## 🛡️ SEGURANÇA

### **O script NÃO vai:**
- ❌ Apagar dados existentes
- ❌ Modificar tabelas de outros módulos
- ❌ Executar DROP DATABASE

### **O script VAI:**
- ✅ Criar apenas **novas tabelas** (se não existirem)
- ✅ Adicionar **novos registros** (seeds)
- ✅ Manter **backup completo** antes de qualquer mudança
- ✅ Permitir **restauração** em caso de erro

---

## 📊 ESTRUTURA QUE SERÁ CRIADA

### **15 Novas Tabelas:**
```
Base (4):
├── unidades
├── categorias
├── localizacoes
└── fornecedores

Materiais (5):
├── materiais
├── materiais_lotes
├── materiais_saldo
├── materiais_movimentacoes
└── projeto_materiais

Equipamentos (3):
├── equipamentos
├── projeto_equipamentos
└── equipamentos_manutencao

Suporte (3):
├── alertas_estoque
├── compras
└── compras_itens
```

### **60 Registros Iniciais:**
- 15 unidades de medida
- 27 categorias
- 13 localizações
- 5 fornecedores

### **4 Stored Procedures:**
- `verificar_pendencias_projeto()`
- `calcular_disponivel_material()`
- `verificar_equipamento_disponivel()`
- `gerar_alertas_automaticos()`

---

## 🔥 TROUBLESHOOTING

### **Erro: "mysqldump não é reconhecido"**

**Solução 1:** Adicionar MySQL ao PATH
```powershell
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

**Solução 2:** Usar caminho completo
```powershell
$mysqldumpCmd = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
```

### **Erro: "Access denied"**

Verifique usuário e senha:
```powershell
mysql -u root -p -e "SELECT 1"
```

### **Erro: "Table already exists"**

Algumas tabelas já existem. Opções:
1. **Seguro:** Pular migrations já executadas (editar script)
2. **Limpar:** DROP das tabelas (use o backup!)

---

## 💾 RESTAURAR BACKUP MANUALMENTE

Se precisar restaurar o backup depois:

```powershell
# Listar backups disponíveis
Get-ChildItem backups\*.sql | Sort-Object LastWriteTime -Descending

# Restaurar backup específico
mysql -u root -p gladpros < backups\gladpros_backup_20251006_143000.sql
```

---

## ✅ VERIFICAR SE DEU CERTO

Após executar, verifique:

```sql
-- Ver tabelas criadas
SHOW TABLES LIKE '%materiais%';
SHOW TABLES LIKE '%equipamentos%';

-- Ver dados seed
SELECT COUNT(*) FROM unidades;
SELECT COUNT(*) FROM categorias;

-- Ver procedures
SHOW PROCEDURE STATUS WHERE Db = 'gladpros';
```

**Resultado esperado:**
- 15 tabelas novas
- 60 registros seed
- 4 procedures

---

## 🚨 EM CASO DE EMERGÊNCIA

### **Se algo der muito errado:**

1. **PARE IMEDIATAMENTE**
2. **NÃO EXECUTE MAIS NADA**
3. **Restaure o backup:**
   ```powershell
   mysql -u root -p gladpros < backups\gladpros_backup_YYYYMMDD_HHMMSS.sql
   ```

4. **Abra uma issue** com:
   - Mensagem de erro completa
   - Arquivo de backup usado
   - Output do script

---

## 📞 SUPORTE

Se precisar de ajuda:
1. Verifique os logs do script
2. Confira o arquivo de backup foi criado
3. Execute validação manual (SQL acima)

---

## 🎯 APÓS EXECUTAR COM SUCESSO

Próximos passos:
1. ✅ **Fase 1 - Semana 2:** Prisma Schema + Types
2. ✅ **Fase 2:** APIs do módulo Estoque
3. ✅ **Fase 3:** Interface React

---

**Criado por:** GitHub Copilot  
**Data:** 06 de outubro de 2025  
**Projeto:** GladPros - Módulo Estoque MVP
