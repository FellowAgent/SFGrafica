# Guia de Teste - Sistema de Imagens de Produtos

## ✅ Implementações Concluídas

### 1. **Utilitário de Diagnóstico de Storage** (`storageHealthCheck.ts`)
- Verifica se o bucket existe
- Testa permissões de leitura/escrita
- Realiza upload de teste
- Retorna relatório detalhado

### 2. **Componente de Status do Storage** (`StorageStatusIndicator.tsx`)
- Mostra status da conexão com Supabase Storage
- Indica se o bucket está acessível
- Botão para executar diagnóstico
- Instruções de correção se houver problemas

### 3. **Script de Setup do Bucket** (`setupStorageBucket.ts`)
- Cria bucket programaticamente (se tiver permissões)
- Fornece instruções de setup manual
- Valida configuração existente

### 4. **Hook de Upload Refatorado** (`useProductImageUpload.ts`)
- Logs detalhados em cada etapa
- Melhor tratamento de erros com mensagens específicas
- Validação do bucket antes do upload
- Retorna informações detalhadas sobre sucesso/falha
- Remove tentativas silenciosas e avisa o usuário

### 5. **Galeria de Imagens Melhorada** (`ProductImageGallery.tsx`)
- Indicadores visuais de status:
  - 🟡 "Aguardando envio" - imagens não enviadas
  - 🔵 "Enviando..." - durante o upload
  - 🟢 "Salva no Supabase" - após upload bem-sucedido
  - 🔴 "Erro no upload" - em caso de falha
- Mostra mensagens de erro específicas
- Feedback visual claro

### 6. **Step de Imagens Atualizado** (`ImagensStep.tsx`)
- Verificação automática do bucket ao montar
- Alerta se bucket não existir
- Componente de diagnóstico expansível
- Instruções de correção

### 7. **Hook de Produtos Aprimorado** (`useProdutos.ts`)
- Logs detalhados de todo o processo
- Validação de URLs retornadas
- Verificação após salvamento no banco
- Avisos claros sobre falhas parciais ou completas

---

## 🧪 Como Testar o Fluxo Completo

### Passo 1: Verificar o Bucket no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Verifique se o bucket **`produtos-imagens`** existe
5. Se NÃO existir:
   - Clique em "New bucket"
   - Nome: `produtos-imagens`
   - Marque como "Public bucket": **SIM**
   - File size limit: `5242880` (5MB)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Clique em "Create bucket"

### Passo 2: Executar as Migrations (se necessário)

Se o bucket não existe, você pode criar via migration SQL:

```bash
# No terminal, na pasta do projeto
npx supabase db push
```

Ou execute manualmente a migration SQL localizada em:
`supabase/migrations/20251124030913_f5fd5d1c-052c-4d7f-992c-f21878cbb49b.sql`

### Passo 3: Iniciar a Aplicação

```bash
npm run dev
```

### Passo 4: Testar Criação de Produto com Imagens

1. **Abra o console do navegador** (F12) para ver os logs detalhados
2. **Navegue até a página de produtos**
3. **Clique em "Novo Produto"**
4. **Vá até a aba "Imagens"**
5. **Observe os alertas de status:**
   - ✅ Verde: "Storage configurado" - bucket está OK
   - 🔴 Vermelho: "Bucket não configurado" - precisa configurar

6. **Se aparecer alerta vermelho:**
   - Clique em "🔧 Diagnóstico e Configuração do Storage"
   - Clique em "Verificar"
   - Siga as instruções exibidas

7. **Adicione imagens:**
   - Arraste e solte 2-3 imagens (JPG, PNG ou WEBP)
   - Observe o processamento e preview
   - Veja os badges de status: "⚠ Aguardando envio"

8. **Preencha os dados básicos do produto:**
   - Nome, preço, etc.

9. **Salve o produto**

10. **Observe no console do navegador:**
    ```
    ============================================================
    🆕 CRIANDO NOVO PRODUTO
    ============================================================
    ✅ Produto criado com ID: [uuid]
    
    📸 Iniciando upload de 3 imagens para produto [uuid]
    ============================================================
    📸 INICIANDO UPLOAD DE 3 IMAGENS
    ============================================================
    🔍 Verificando se bucket existe...
    ✅ Bucket "produtos-imagens" existe e está acessível
    📁 Pasta de upload: [uuid]
    
    ------------------------------------------------------------
    📸 PROCESSANDO IMAGEM 1/3
    ------------------------------------------------------------
    📤 Fazendo upload para: [uuid]/principal-[timestamp].jpg
    ✅ Upload da imagem 1 CONCLUÍDO!
       URL: https://[project].supabase.co/storage/v1/object/public/produtos-imagens/[uuid]/principal-[timestamp].jpg
    
    [... repetir para cada imagem ...]
    
    ============================================================
    📊 RESUMO DO UPLOAD
    ============================================================
    ✅ Sucesso: 3/3 imagens
    ❌ Falhas: 0
    
    📎 URLs enviadas:
       1. https://...
       2. https://...
       3. https://...
    ============================================================
    
    ✅ VERIFICAÇÃO DO BANCO:
       imagem_url: https://...
       imagens (3): [...]
    ```

11. **Verifique no Supabase:**
    - Vá em **Storage** → `produtos-imagens`
    - Você deve ver uma pasta com o ID do produto
    - Dentro dela, as imagens: `principal-[timestamp].jpg`, `adicional-0-[timestamp].jpg`, etc.

12. **Verifique na tabela:**
    - Vá em **Table Editor** → `produtos`
    - Encontre o produto criado
    - Verifique os campos `imagem_url` e `imagens`
    - Ambos devem conter as URLs completas do Supabase Storage

### Passo 5: Testar Edição de Produto

1. **Edite o produto criado**
2. **Vá até a aba "Imagens"**
3. **Observe que as imagens agora aparecem com badge verde:** "✓ Salva no Supabase"
4. **Adicione mais uma imagem**
5. **Remova uma imagem existente**
6. **Salve o produto**
7. **Observe no console:**
   ```
   ============================================================
   📝 ATUALIZANDO PRODUTO [uuid]
   ============================================================
   
   📸 Processando 3 imagens para produto [uuid]
   📸 URLs antigas no banco (3): [...]
   📸 URLs já no storage (2): [...]
   🗑️ URLs para deletar (1): [...]
   🗑️ Deletando imagens removidas...
   ✅ Imagens antigas deletadas
   
   [... upload da nova imagem ...]
   
   ✅ VERIFICAÇÃO DO BANCO:
      imagem_url: https://...
      imagens (3): [...]
   ```

---

## 🐛 Resolução de Problemas

### Problema: "Bucket 'produtos-imagens' não existe" (mas o bucket existe)

**Causa:** A verificação anterior usava `listBuckets()` que pode não ter permissões adequadas.

**Solução Aplicada:** 
- O sistema agora usa uma verificação mais robusta que tenta acessar o bucket diretamente
- Mesmo se não puder listar buckets, consegue detectar se o bucket existe
- Se receber erro de permissão ao listar conteúdo, assume que o bucket existe (está correto)

**Se ainda aparecer erro:**
1. Verifique se está autenticado no sistema
2. Vá no painel do Supabase e confirme que o bucket existe
3. Recarregue a página (F5) para renovar a sessão

### Problema: "Bucket 'produtos-imagens' não existe" (bucket realmente não existe)

**Solução:**
1. Vá no painel do Supabase
2. Storage → New bucket → Nome: `produtos-imagens`
3. Marque como público
4. Ou execute a migration SQL

### Problema: "Erro ao fazer upload: permission denied"

**Solução:**
1. Verifique se está autenticado
2. Vá no painel do Supabase → Storage → `produtos-imagens` → Policies
3. Certifique-se de que existe a policy:
   - "Usuários autenticados podem fazer upload de imagens de produtos"
4. Se não existir, execute a migration SQL

### Problema: "Imagens não aparecem após salvar"

**Verificações:**
1. Abra o console do navegador e procure por erros
2. Vá no Supabase Storage e verifique se os arquivos foram criados
3. Verifique na tabela `produtos` se os campos `imagem_url` e `imagens` foram preenchidos
4. Se os arquivos estão no Storage mas não aparecem, pode ser problema de permissão de leitura

### Problema: Toast "Nenhuma imagem foi enviada com sucesso"

**Verificações:**
1. Verifique se o bucket existe
2. Use o componente de diagnóstico na aba Imagens
3. Clique em "Verificar" e veja o relatório detalhado
4. Siga as instruções de correção

---

## 📋 Checklist de Verificação

- [ ] Bucket `produtos-imagens` existe no Supabase
- [ ] Bucket está marcado como público
- [ ] Políticas RLS estão configuradas (migration executada)
- [ ] Ao adicionar imagens, elas aparecem com badge "⚠ Aguardando envio"
- [ ] Ao salvar produto, console mostra logs detalhados de upload
- [ ] Console mostra "✅ Sucesso: X/X imagens"
- [ ] Console mostra "✅ VERIFICAÇÃO DO BANCO" com as URLs
- [ ] Imagens aparecem no Supabase Storage
- [ ] Campos `imagem_url` e `imagens` estão preenchidos na tabela
- [ ] Ao reabrir produto, imagens aparecem com badge "✓ Salva no Supabase"
- [ ] É possível adicionar/remover imagens e salvar novamente

---

## 🎯 Resultado Esperado

Após seguir todos os passos:

✅ **TODAS as imagens devem ser gravadas no bucket `produtos-imagens` do Supabase**
✅ **Feedback visual claro sobre o status de cada imagem**
✅ **Erros são exibidos claramente ao usuário**
✅ **Sistema detecta automaticamente problemas de configuração**
✅ **Logs detalhados no console para debugging**
✅ **Verificação automática após salvamento**

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique o console do navegador** - todos os erros são logados lá
2. **Use o componente de diagnóstico** na aba Imagens
3. **Verifique os logs detalhados** - cada etapa é registrada
4. **Consulte este guia** para soluções de problemas comuns

---

**Boa sorte com os testes! 🚀**

