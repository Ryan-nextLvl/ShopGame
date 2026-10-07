-- =============================================================
-- ShopGame - Dados iniciais para teste
-- Executar depois das tabelas, views, functions e procedures.
-- =============================================================

INSERT INTO categorias (nome, descricao) VALUES
 ('Consoles',            'Videogames de mesa e portáteis'),
 ('Jogos',               'Mídias físicas de jogos'),
 ('Peças e Acessórios',  'Controles, peças de reposição, cabos e periféricos');

INSERT INTO produtos (nome, categoria_id, plataforma, preco, estoque, estoque_minimo) VALUES
 -- Consoles
 ('PlayStation 5 Slim 1TB',            1, 'PS5',          3899.90,  6, 2),
 ('Xbox Series X 1TB',                 1, 'Xbox Series',  4199.90,  4, 2),
 ('Xbox Series S 512GB',               1, 'Xbox Series',  2499.90,  5, 2),
 ('Nintendo Switch OLED',              1, 'Switch',       2299.90,  3, 2),
 ('Nintendo Switch 2',                 1, 'Switch',       3999.90,  2, 1),
 -- Jogos
 ('EA Sports FC 26',                   2, 'PS5',           349.90, 15, 5),
 ('God of War Ragnarök',               2, 'PS5',           199.90,  8, 3),
 ('Forza Horizon 5',                   2, 'Xbox Series',   179.90,  6, 3),
 ('The Legend of Zelda: Tears of the Kingdom', 2, 'Switch', 349.90, 5, 3),
 ('Mario Kart World',                  2, 'Switch',        449.90,  7, 3),
 ('GTA V Premium Edition',             2, 'Multi',         129.90, 10, 4),
 ('Minecraft',                         2, 'Multi',         149.90,  2, 3),
 -- Peças e Acessórios
 ('Controle DualSense Branco',         3, 'PS5',           449.90, 10, 3),
 ('Controle Xbox Wireless',            3, 'Xbox Series',   399.90,  8, 3),
 ('Joy-Con Par (Neon)',                3, 'Switch',        549.90,  4, 2),
 ('SSD NVMe 1TB com dissipador',       3, 'PS5',           599.90,  5, 2),
 ('Analógico de reposição (par)',      3, 'Multi',          39.90, 30, 10),
 ('Cooler para PS4 / PS5',             3, 'PS5',            89.90,  0, 2),
 ('Fonte de alimentação Xbox One',     3, 'Xbox Series',   249.90,  3, 2),
 ('Headset Gamer HyperX Cloud II',     3, 'Multi',         499.90,  6, 2),
 ('Cabo HDMI 2.1 8K 2m',               3, 'Multi',          59.90, 25, 5);

INSERT INTO clientes (nome, cpf, email, telefone) VALUES
 ('Ana Beatriz Souza',    '111.222.333-44', 'ana.souza@email.com',     '(86) 99911-2233'),
 ('Carlos Henrique Lima', '222.333.444-55', 'carlos.lima@email.com',   '(86) 99822-3344'),
 ('Fernanda Rocha',       '333.444.555-66', 'fernanda.rocha@email.com','(86) 99733-4455'),
 ('João Pedro Alves',     '444.555.666-77', 'joao.alves@email.com',    '(86) 99644-5566'),
 ('Mariana Costa',        '555.666.777-88', 'mariana.costa@email.com', '(86) 99555-6677');

-- Vendas históricas registradas pela própria procedure
-- (assim o estoque e as movimentações ficam consistentes).
CALL sp_realizar_venda(1, 'CREDITO', '[{"produto_id": 1, "quantidade": 1}, {"produto_id": 13, "quantidade": 1}]');
CALL sp_realizar_venda(1, 'PIX',     '[{"produto_id": 6, "quantidade": 1}, {"produto_id": 7, "quantidade": 1}]');
CALL sp_realizar_venda(2, 'DEBITO',  '[{"produto_id": 3, "quantidade": 1}]');
CALL sp_realizar_venda(3, 'PIX',     '[{"produto_id": 17, "quantidade": 2}, {"produto_id": 21, "quantidade": 1}]');
CALL sp_realizar_venda(1, 'CREDITO', '[{"produto_id": 2, "quantidade": 1}, {"produto_id": 14, "quantidade": 1}]');
CALL sp_realizar_venda(4, 'DINHEIRO','[{"produto_id": 11, "quantidade": 1}, {"produto_id": 12, "quantidade": 1}]');
CALL sp_realizar_venda(2, 'CREDITO', '[{"produto_id": 10, "quantidade": 1}]');
CALL sp_realizar_venda(5, 'PIX',     '[{"produto_id": 4, "quantidade": 1}, {"produto_id": 9, "quantidade": 1}]');

-- Espalha as vendas históricas pelos últimos dias para o relatório
UPDATE vendas SET data_venda = NOW() - ((9 - id) * INTERVAL '3 days') - INTERVAL '2 hours';
UPDATE movimentacoes_estoque m
   SET data = v.data_venda
  FROM vendas v
 WHERE m.venda_id = v.id;

-- Entradas de estoque de exemplo
CALL sp_registrar_entrada_estoque(6, 5, 'NF 4521 - Distribuidora GameBR');
CALL sp_registrar_entrada_estoque(17, 20, 'NF 4522 - Peças Tech Ltda');
