-- ============================================
-- LIMPEZA DE URLS BLOB CORROMPIDAS
-- ============================================
-- Este script corrige produtos com URLs blob que não funcionam

-- 1. Limpar URLs blob inválidas (temporárias que não persistem)
UPDATE produtos 
SET 
  imagem_url = NULL,
  imagens = NULL
WHERE imagem_url LIKE 'blob:%';

-- 2. Converter produtos com apenas imagem_url válida em array imagens
UPDATE produtos
SET imagens = ARRAY[imagem_url]
WHERE imagem_url IS NOT NULL 
  AND imagem_url NOT LIKE 'blob:%'
  AND imagem_url LIKE '%produtos-imagens%'
  AND (imagens IS NULL OR array_length(imagens, 1) IS NULL);

-- 3. Limpar imagens blob do array imagens (se houver)
UPDATE produtos
SET imagens = (
  SELECT array_agg(url) 
  FROM unnest(imagens) AS url
  WHERE url NOT LIKE 'blob:%'
)
WHERE imagens IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM unnest(imagens) AS url 
    WHERE url LIKE 'blob:%'
  );