# Modelo de dados — ShopGame

```mermaid
erDiagram
    CATEGORIAS ||--o{ PRODUTOS : classifica
    CLIENTES   ||--o{ VENDAS : realiza
    VENDAS     ||--|{ ITENS_VENDA : contem
    PRODUTOS   ||--o{ ITENS_VENDA : "vendido em"
    PRODUTOS   ||--o{ MOVIMENTACOES_ESTOQUE : movimenta
    VENDAS     |o--o{ MOVIMENTACOES_ESTOQUE : origina

    CATEGORIAS {
        int id PK
        varchar nome
        varchar descricao
    }
    PRODUTOS {
        int id PK
        varchar nome
        int categoria_id FK
        varchar plataforma
        numeric preco
        int estoque
        int estoque_minimo
        boolean ativo
    }
    CLIENTES {
        int id PK
        varchar nome
        varchar cpf UK
        varchar email
        varchar telefone
    }
    VENDAS {
        int id PK
        int cliente_id FK
        timestamp data_venda
        varchar forma_pagamento
        numeric subtotal
        numeric desconto
        numeric total
        varchar status
    }
    ITENS_VENDA {
        int id PK
        int venda_id FK
        int produto_id FK
        int quantidade
        numeric preco_unitario
    }
    MOVIMENTACOES_ESTOQUE {
        int id PK
        int produto_id FK
        varchar tipo
        int quantidade
        varchar motivo
        int venda_id FK
        timestamp data
    }
```

## Recursos do banco x telas

| Recurso | Tipo | Tela que usa |
|---|---|---|
| `vw_relatorio_vendas` | View | Relatório de Vendas, Dashboard |
| `vw_produtos_estoque` | View | Produtos & Estoque, Nova Venda, Dashboard |
| `fn_nivel_cliente` | Function | Clientes, Nova Venda |
| `fn_calcular_desconto` | Function | Nova Venda (e dentro de `sp_realizar_venda`) |
| `sp_realizar_venda` | Procedure | Nova Venda → Finalizar venda |
| `sp_registrar_entrada_estoque` | Procedure | Produtos & Estoque → + Entrada / Novo produto |
| `sp_cancelar_venda` | Procedure | Relatório de Vendas → Cancelar |
