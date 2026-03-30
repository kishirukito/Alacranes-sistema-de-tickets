-- ================================================================
-- ALACRANES DE DURANGO — SEED DATA (VOLCADO DE DATOS INICIALES)
-- ================================================================
-- Ejecutar DESPUÉS de schema.sql y schema_additions.sql.
-- Contiene: equipos rivales, partidos de temporada 2025,
-- inventario por zona, códigos de descuento de ejemplo.
-- ================================================================

-- ================================================================
-- 1. EQUIPOS RIVALES (Liga TDP — Zona Norte)
-- ================================================================
INSERT INTO public.teams (name, short_name, city, is_home_team) VALUES
  ('Alacranes de Durango',    'DGO', 'Durango, Dgo.',       TRUE),
  ('Mineros de Zacatecas',    'ZAC', 'Zacatecas, Zac.',     FALSE),
  ('Cañeros de Los Mochis',   'MOC', 'Los Mochis, Sin.',    FALSE),
  ('Tomateros de Culiacán',   'CUL', 'Culiacán, Sin.',      FALSE),
  ('Naranjeros de Hermosillo','HER', 'Hermosillo, Son.',    FALSE),
  ('Yaquis de Obregón',       'OBR', 'Cd. Obregón, Son.',  FALSE),
  ('Venados de Mazatlán',     'MAZ', 'Mazatlán, Sin.',      FALSE),
  ('Águilas de Mexicali',     'MEX', 'Mexicali, BC.',       FALSE),
  ('Charros de Jalisco',      'JAL', 'Guadalajara, Jal.',   FALSE),
  ('Diablos Rojos del México','CDM', 'Ciudad de México',    FALSE)
ON CONFLICT DO NOTHING;


-- ================================================================
-- 2. VENUE (ya debería existir del schema.sql base)
-- ================================================================
INSERT INTO public.venues (name, city, address, capacity) VALUES
  ('Estadio Zarco', 'Durango', 'Blvd. Francisco Villa s/n, Col. El Nayar, Durango', 9000)
ON CONFLICT DO NOTHING;


-- ================================================================
-- 3. ZONAS DEL ESTADIO ZARCO
--    Con precios actualizados para temporada 2025
-- ================================================================
INSERT INTO public.zones (venue_id, zone_key, name, price, total_seats, color_hex, gate)
SELECT
  v.id,
  z.zone_key,
  z.name,
  z.price,
  z.total_seats,
  z.color_hex,
  z.gate
FROM public.venues v
CROSS JOIN (VALUES
  ('palco-vip',     'Palco VIP',      500.00, 200,  '#B8860B', 'VIP'),
  ('premium-norte', 'Premium Norte',  350.00, 800,  '#F5C518', 'A'),
  ('lateral-este',  'Lateral Este',   200.00, 1200, '#D32F2F', 'B'),
  ('lateral-oeste', 'Lateral Oeste',  200.00, 1200, '#D32F2F', 'C'),
  ('general-sur',   'General Sur',    150.00, 3000, '#E53935', 'D'),
  ('estudiantes',   'Estudiantes',    100.00, 500,  '#43A047', 'E')
) AS z(zone_key, name, price, total_seats, color_hex, gate)
WHERE v.name = 'Estadio Zarco'
ON CONFLICT (venue_id, zone_key) DO NOTHING;


-- ================================================================
-- 4. PARTIDOS TEMPORADA 2025
-- ================================================================
-- Nota: Los UUIDs de home_team y venue se obtienen mediante subconsultas
-- para garantizar portabilidad entre instancias de Supabase.

INSERT INTO public.matches (
  home_team_id,
  away_team_id,
  venue_id,
  match_date,
  match_time,
  day_of_week,
  season,
  competition,
  is_published
)
SELECT
  home.id,
  away.id,
  v.id,
  m.match_date::DATE,
  m.match_time::TIME,
  m.day_of_week,
  '2025',
  'Liga TDP — Zona Norte',
  TRUE
FROM (VALUES
  ('Mineros de Zacatecas',    '2025-04-04', '20:00', 'VIERNES'),
  ('Cañeros de Los Mochis',   '2025-04-11', '20:00', 'VIERNES'),
  ('Naranjeros de Hermosillo','2025-04-18', '20:00', 'VIERNES'),
  ('Tomateros de Culiacán',   '2025-04-25', '20:00', 'VIERNES'),
  ('Yaquis de Obregón',       '2025-05-02', '20:00', 'VIERNES'),
  ('Venados de Mazatlán',     '2025-05-09', '20:00', 'VIERNES'),
  ('Mineros de Zacatecas',    '2025-05-16', '20:00', 'VIERNES'),
  ('Charros de Jalisco',      '2025-05-23', '20:00', 'VIERNES'),
  ('Águilas de Mexicali',     '2025-05-30', '20:00', 'VIERNES'),
  ('Tomateros de Culiacán',   '2025-06-06', '19:30', 'VIERNES'),
  ('Naranjeros de Hermosillo','2025-06-13', '19:30', 'VIERNES'),
  ('Cañeros de Los Mochis',   '2025-06-20', '19:30', 'VIERNES')
) AS m(away_team_name, match_date, match_time, day_of_week)
JOIN public.teams home ON home.name = 'Alacranes de Durango'
JOIN public.teams away ON away.name = m.away_team_name
JOIN public.venues v ON v.name = 'Estadio Zarco'
ON CONFLICT DO NOTHING;


-- ================================================================
-- 5. INVENTARIO DE PARTIDOS POR ZONA
--    Genera automáticamente el inventario para cada partido × zona
-- ================================================================
INSERT INTO public.match_zone_inventory (match_id, zone_id, available_seats)
SELECT
  m.id AS match_id,
  z.id AS zone_id,
  z.total_seats AS available_seats
FROM public.matches m
CROSS JOIN public.zones z
JOIN public.venues v ON v.id = z.venue_id AND v.id = m.venue_id
WHERE m.season = '2025'
ON CONFLICT (match_id, zone_id) DO NOTHING;


-- ================================================================
-- 6. CÓDIGOS DE DESCUENTO DE EJEMPLO
-- ================================================================
-- Nota: created_by es NULL aquí (códigos de sistema/seed)
INSERT INTO public.discount_codes (code, type, value, description, min_purchase, max_uses, is_active)
VALUES
  ('BIENVENIDO10', 'percentage', 10.00, 'Descuento de bienvenida 10%',   0,   500,  TRUE),
  ('VIP20',        'percentage', 20.00, 'Descuento VIP 20%',              500, 100,  TRUE),
  ('FIJO50',       'fixed',      50.00, 'Descuento fijo $50 MXN',         200, 200,  TRUE),
  ('ESTUDIANTE15', 'percentage', 15.00, 'Descuento estudiante 15%',       0,   300,  TRUE),
  ('TEMPORADA25',  'percentage', 25.00, 'Promoción temporada 25%',        300, 50,   FALSE)
ON CONFLICT (code) DO NOTHING;


-- ================================================================
-- 7. PATROCINADORES DE EJEMPLO
-- ================================================================
INSERT INTO public.sponsors (name, logo_url, website_url, tier, is_active, display_order)
VALUES
  ('Cerveza Indio',        NULL, 'https://www.cervezaindio.com.mx', 'platinum', TRUE, 1),
  ('Telcel',               NULL, 'https://www.telcel.com',           'gold',     TRUE, 2),
  ('Grupo Industrial Lala',NULL, 'https://www.lala.com.mx',          'gold',     TRUE, 3),
  ('Sabritas',             NULL, 'https://www.sabritas.com.mx',       'silver',   TRUE, 4),
  ('OXXO',                 NULL, 'https://www.oxxo.com',              'silver',   TRUE, 5),
  ('Bancoppel',            NULL, 'https://www.bancoppel.com',         'bronze',   TRUE, 6)
ON CONFLICT DO NOTHING;


-- ================================================================
-- 8. VERIFICACIÓN FINAL
-- ================================================================
-- Ejecuta esto para confirmar que todo se instaló correctamente:
/*
SELECT 'teams'              AS tabla, COUNT(*) AS registros FROM public.teams
UNION ALL
SELECT 'venues',            COUNT(*) FROM public.venues
UNION ALL
SELECT 'zones',             COUNT(*) FROM public.zones
UNION ALL
SELECT 'matches',           COUNT(*) FROM public.matches
UNION ALL
SELECT 'match_zone_inventory', COUNT(*) FROM public.match_zone_inventory
UNION ALL
SELECT 'discount_codes',    COUNT(*) FROM public.discount_codes
UNION ALL
SELECT 'roles',             COUNT(*) FROM public.roles
UNION ALL
SELECT 'sponsors',          COUNT(*) FROM public.sponsors;
*/
