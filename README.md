# C4 Gestão - Módulo Conferência

Aplicativo PWA para conferência rápida de entradas de mercadorias em estoque, com registro de produtos, lotes, vencimentos e endereçamento.

## Como usar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse `http://localhost:3000`.

## Deploy no GitHub Pages

Este projeto já inclui um workflow para publicação automática no GitHub Pages.

## Importação de produtos por Excel

Na barra superior do app há o botão **Importar Excel**. Ele importa produtos e saldo inicial.

- Formatos aceitos: `.xlsx` e `.xls`
- Colunas obrigatórias: `Codigo de Barras` e `Descricao`
- Colunas opcionais: `Quantidade`, `Unidade`, `Categoria`, `Lote`, `Fabricacao`, `Vencimento`, `Endereco`, `Fornecedor`, `Numero da Nota`, `Data de Recebimento`, `Observacoes`

Se o produto já existir, o cadastro é atualizado; se vier `quantidade`, o saldo é somado ao estoque atual.

## Exportação do estoque

Na tela de consulta, o botão **Exportar Excel** gera uma planilha no mesmo layout da importação, facilitando baixar, revisar e reimportar a base quando necessário.

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- PWA (manifest + service worker)
