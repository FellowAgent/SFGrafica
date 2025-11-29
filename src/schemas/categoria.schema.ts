import { z } from "zod";

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  descricao: z.string().trim().max(500, "Descrição muito longa").optional(),
  ativo: z.boolean().default(true),
  categoria_pai_id: z.string().uuid("Categoria pai inválida").optional().nullable(),
  nivel: z.number().int().min(0).default(0).optional(),
});

export const categoriaUpdateSchema = categoriaSchema.partial();

export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type CategoriaUpdateInput = z.infer<typeof categoriaUpdateSchema>;
