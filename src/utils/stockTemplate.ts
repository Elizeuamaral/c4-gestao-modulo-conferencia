export const STOCK_TEMPLATE_HEADERS = [
  'Codigo de barra',
  'Descricao',
  'Lote',
  'Fabricacao',
  'Vencimento',
  'Endereco',
  'Quantidade',
  'Un. Medida',
] as const;

export const MOVEMENT_EXPORT_HEADERS = [
  ...STOCK_TEMPLATE_HEADERS,
] as const;

export const STOCK_TEMPLATE_ALIASES: Record<(typeof STOCK_TEMPLATE_HEADERS)[number], string[]> = {
  'Codigo de barra': ['Codigo de barra', 'Codigo de barras', 'Codigo', 'Cod_Barras', 'EAN', 'Barcode'],
  Descricao: ['Descricao', 'Descricao Produto', 'Produto', 'Nome', 'Nome Produto'],
  Lote: ['Lote'],
  Fabricacao: ['Fabricacao', 'Data Fabricacao'],
  Vencimento: ['Vencimento', 'Validade', 'Data Validade'],
  Endereco: ['Endereco', 'Local', 'Localizacao'],
  Quantidade: ['Quantidade', 'Qtd', 'Estoque', 'Saldo'],
  'Un. Medida': ['Un. Medida', 'Unidade', 'Un', 'UM'],
};
