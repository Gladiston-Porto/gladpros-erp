CREATE INDEX `idx_pmov_projeto_id`
  ON `projetos_movimentacoes_estoque`(`projeto_id`, `id`);

CREATE INDEX `idx_pmov_projeto_criado_material`
  ON `projetos_movimentacoes_estoque`(`projeto_id`, `criado_em`, `material_id`);

CREATE INDEX `idx_pmov_projeto_material_id`
  ON `projetos_movimentacoes_estoque`(`projeto_id`, `material_id`, `id`);
