# Instruções para Aplicar Migration de Variações

## 📋 O que foi feito

Foi criada uma nova migration para adicionar o campo `atributo` à tabela `variacoes_produto`.

**Arquivo da migration:** `supabase/migrations/20251125000000_add_atributo_to_variacoes.sql`

## 🚀 Como Aplicar a Migration

### Opção 1: Via Supabase CLI (Recomendado)

Se você tem o Supabase CLI configurado:

```bash
# Aplicar todas as migrations pendentes
supabase db push
```

### Opção 2: Via Dashboard do Supabase (Manual)

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o seguinte SQL:

```sql
-- Adicionar campo atributo à tabela variacoes_produto
ALTER TABLE public.variacoes_produto 
ADD COLUMN IF NOT EXISTS atributo TEXT;

-- Criar índice para melhor performance em buscas por atributo
CREATE INDEX IF NOT EXISTS idx_variacoes_atributo ON public.variacoes_produto(atributo);

-- Comentário explicativo
COMMENT ON COLUMN public.variacoes_produto.atributo IS 'Atributo ou característica específica da variação (ex: Cor Azul, Tamanho M)';
```

5. Clique em **Run** para executar

## ✅ Verificação

Para verificar se a migration foi aplicada com sucesso, execute:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'variacoes_produto' 
AND column_name = 'atributo';
```

Se retornar uma linha, a migration foi aplicada com sucesso!

## 📝 Campos da Tabela variacoes_produto

Após a migration, a tabela terá os seguintes campos:

- `id` (UUID) - Identificador único
- `produto_id` (UUID) - Referência ao produto
- `nome` (TEXT) - Nome da variação ✨ (obrigatório)
- `atributo` (TEXT) - Atributo da variação ✨ (novo campo)
- `valor_adicional` (NUMERIC) - Preço adicional
- `estoque` (INTEGER) - Quantidade em estoque
- `sku` (TEXT) - Código SKU
- `codigo_barras` (TEXT) - Código de barras
- `imagem_url` (TEXT) - URL da imagem
- `template_id` (UUID) - Template usado (se aplicável)
- `opcao_variacao_id` (UUID) - Opção do template (se aplicável)
- `ativo` (BOOLEAN) - Status ativo/inativo
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização

## 🎯 Como os Campos Manuais São Salvos

Quando você adiciona uma variação manualmente:

1. **Nome da Variação** → `nome` (obrigatório)
2. **Atributo da variação** → `atributo` (opcional)
3. **Preço Adicional** → `valor_adicional`
4. **Código/SKU** → `sku` e `codigo_barras`
5. **Estoque** → `estoque`

Todos os campos são salvos imediatamente no banco de dados quando você clica em "Adicionar Variação".

