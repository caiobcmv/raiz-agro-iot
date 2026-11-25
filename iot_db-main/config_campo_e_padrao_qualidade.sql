-- =============================================================================
-- RAIZ AGRO IOT - FAIXAS AGRONÔMICAS DE CAMPO & PADRÕES DE QUALIDADE (DEMO)
-- Idempotente: pode ser executado repetidas vezes sem duplicar ou corromper dados.
-- NUNCA toca nas leituras reais de sensores ('thingspeak').
-- =============================================================================

-- (a) Faixas de limites climáticos para a etapa 'campo' (Manga=1, Uva=2, Melão=3)
-- Permite que a view vw_lote_saude e as consultas de conformidade do lote em produção funcionem.
-- Valores fisiológicos de referência no Vale do São Francisco (dados de referência / fictícios).

INSERT INTO config_parametro (fk_fruta_id_fruta, etapa, temp_min, temp_max, umidade_min, umidade_max)
SELECT f.id_fruta, 'campo', 20.0, 35.0, 40.0, 80.0
FROM fruta f
WHERE f.id_fruta = 1 -- Manga
  AND NOT EXISTS (
      SELECT 1 FROM config_parametro 
      WHERE fk_fruta_id_fruta = 1 AND etapa = 'campo'
  );

INSERT INTO config_parametro (fk_fruta_id_fruta, etapa, temp_min, temp_max, umidade_min, umidade_max)
SELECT f.id_fruta, 'campo', 15.0, 32.0, 45.0, 85.0
FROM fruta f
WHERE f.id_fruta = 2 -- Uva
  AND NOT EXISTS (
      SELECT 1 FROM config_parametro 
      WHERE fk_fruta_id_fruta = 2 AND etapa = 'campo'
  );

INSERT INTO config_parametro (fk_fruta_id_fruta, etapa, temp_min, temp_max, umidade_min, umidade_max)
SELECT f.id_fruta, 'campo', 18.0, 34.0, 50.0, 85.0
FROM fruta f
WHERE f.id_fruta = 3 -- Melão
  AND NOT EXISTS (
      SELECT 1 FROM config_parametro 
      WHERE fk_fruta_id_fruta = 3 AND etapa = 'campo'
  );

-- (b) Padrões mínimos de qualidade por variedade (quando carregadas via dados_demo.sql)
-- Inserção idempotente condicionada à existência das variedades no banco.
INSERT INTO padrao_qualidade (fk_variedade_id_variedade, brix_min, calibre_min, classe)
SELECT v.id_variedade,
       CASE 
         WHEN f.nome ILIKE '%uva%' THEN 16.0
         WHEN f.nome ILIKE '%manga%' THEN 14.0
         ELSE 12.0
       END AS brix_min,
       'Classe 1' AS calibre_min,
       'Exportação A+' AS classe
FROM variedade v
JOIN fruta f ON f.id_fruta = v.fk_fruta_id_fruta
ON CONFLICT (fk_variedade_id_variedade) DO UPDATE 
SET brix_min = EXCLUDED.brix_min,
    calibre_min = EXCLUDED.calibre_min,
    classe = EXCLUDED.classe;
