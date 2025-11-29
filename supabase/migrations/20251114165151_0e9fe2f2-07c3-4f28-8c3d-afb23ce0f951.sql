-- Renomear tabela vendedores_fluxo para funcionarios_fluxo
ALTER TABLE public.vendedores_fluxo RENAME TO funcionarios_fluxo;

-- Renomear índices associados (se existirem)
ALTER INDEX IF EXISTS vendedores_fluxo_pkey RENAME TO funcionarios_fluxo_pkey;
ALTER INDEX IF EXISTS vendedores_fluxo_user_id_idx RENAME TO funcionarios_fluxo_user_id_idx;

-- Adicionar comentário na tabela
COMMENT ON TABLE public.funcionarios_fluxo IS 'Tabela que gerencia a ordem e status ativo dos funcionários no fluxo de trabalho';