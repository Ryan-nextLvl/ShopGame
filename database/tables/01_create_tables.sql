-- =============================================================
-- ShopGame - Criação das tabelas
-- SGBD: PostgreSQL
-- =============================================================

DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- Categorias de produto: Consoles, Jogos, Peças e Acessórios
CREATE TABLE categorias (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(60) NOT NULL UNIQUE,
    descricao VARCHAR(200)
);

CREATE TABLE produtos (
    id             SERIAL PRIMARY KEY,
    nome           VARCHAR(120)  NOT NULL,
    categoria_id   INT           NOT NULL REFERENCES categorias(id),
    plataforma     VARCHAR(40)   NOT NULL,           -- PS5, Xbox Series, Switch, PC, Multi...
    preco          NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    estoque        INT           NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    estoque_minimo INT           NOT NULL DEFAULT 2 CHECK (estoque_minimo >= 0),
    ativo          BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE clientes (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(120) NOT NULL,
    cpf       VARCHAR(14)  NOT NULL UNIQUE,
    email     VARCHAR(120),
    telefone  VARCHAR(20),
    criado_em TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE vendas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INT           NOT NULL REFERENCES clientes(id),
    data_venda      TIMESTAMP     NOT NULL DEFAULT NOW(),
    forma_pagamento VARCHAR(20)   NOT NULL
                    CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO')),
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    desconto        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'CONCLUIDA'
                    CHECK (status IN ('CONCLUIDA','CANCELADA'))
);

CREATE TABLE itens_venda (
    id             SERIAL PRIMARY KEY,
    venda_id       INT           NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id     INT           NOT NULL REFERENCES produtos(id),
    quantidade     INT           NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0)
);

-- Histórico de entradas e saídas de estoque
CREATE TABLE movimentacoes_estoque (
    id         SERIAL PRIMARY KEY,
    produto_id INT          NOT NULL REFERENCES produtos(id),
    tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    quantidade INT          NOT NULL CHECK (quantidade > 0),
    motivo     VARCHAR(200) NOT NULL,
    venda_id   INT          REFERENCES vendas(id),
    data       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendas_cliente   ON vendas(cliente_id);
CREATE INDEX idx_vendas_data      ON vendas(data_venda);
CREATE INDEX idx_itens_venda      ON itens_venda(venda_id);
CREATE INDEX idx_mov_produto      ON movimentacoes_estoque(produto_id);
