export const STOCK_TEMPLATE_HEADERS = [
  'Codigo de Barras',
  'Descricao',
  'Quantidade',
  'Unidade',
  'Categoria',
  'Lote',
  'Fabricacao',
  'Vencimento',
  'Endereco',
  'Fornecedor',
  'Numero da Nota',
  'Data de Recebimento',
  'Observacoes',
] as const;

export const MOVEMENT_EXPORT_HEADERS = [
  ...STOCK_TEMPLATE_HEADERS,
  'Tipo de Movimentacao',
  'Data/Hora da Movimentacao',
] as const;

export const STOCK_TEMPLATE_ALIASES: Record<(typeof STOCK_TEMPLATE_HEADERS)[number], string[]> = {
  'Codigo de Barras': ['Codigo de Barras', 'Codigo', 'Codigo de Barras', 'Cod_Barras', 'EAN', 'Barcode'],
  Descricao: ['Descricao', 'Descricao Produto', 'Produto', 'Nome', 'Nome Produto'],
  Quantidade: ['Quantidade', 'Qtd', 'Estoque', 'Saldo'],
  Unidade: ['Unidade', 'Un', 'UM'],
  Categoria: ['Categoria', 'Grupo', 'Setor'],
  Lote: ['Lote'],
  Fabricacao: ['Fabricacao', 'Data Fabricacao'],
  Vencimento: ['Vencimento', 'Validade', 'Data Validade'],
  Endereco: ['Endereco', 'Local', 'Localizacao'],
  Fornecedor: ['Fornecedor'],
  'Numero da Nota': ['Numero da Nota', 'Numero Nota', 'Nota', 'NF', 'Nota Fiscal'],
  'Data de Recebimento': ['Data de Recebimento', 'Recebimento', 'Data Recebimento', 'Recebido em'],
  Observacoes: ['Observacoes', 'Observacao', 'Notas'],
};
