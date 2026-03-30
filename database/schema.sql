-- ================================================================
-- ALACRANES DE DURANGO — SUPABASE DATABASE SCHEMA
-- ================================================================
-- Ejecutar en el SQL Editor de Supabase en este orden.
-- Supabase maneja la tabla auth.users automáticamente.
-- ================================================================

-- ------------------------------------------------------------
-- EXTENSIONES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PERFILES DE USUARIO
--    Extiende auth.users de Supabase con datos adicionales
-- ================================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'fan' CHECK (role IN ('fan', 'admin', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- 2. EQUIPOS
-- ================================================================
CREATE TABLE public.teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,           -- Ej: 'DGO', 'ZAP'
  logo_url      TEXT,
  city          TEXT,
  is_home_team  BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = Alacranes de Durango
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 3. ESTADIOS / VENUES
-- ================================================================
CREATE TABLE public.venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,           -- Ej: 'Estadio Zarco'
  city          TEXT NOT NULL,
  address       TEXT,
  capacity      INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 4. ZONAS DEL ESTADIO
--    Define las zonas de precio para cada venue
-- ================================================================
CREATE TABLE public.zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id      UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  zone_key      TEXT NOT NULL,           -- Ej: 'premium-norte', 'general-sur'
  name          TEXT NOT NULL,           -- Nombre visible: 'Premium Norte'
  price         NUMERIC(10,2) NOT NULL,
  total_seats   INTEGER NOT NULL,
  color_hex     TEXT,                    -- Color en el mapa SVG
  gate          TEXT,                    -- Puerta de acceso
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_id, zone_key)
);

-- ================================================================
-- 5. ASIENTOS
--    Asientos individuales dentro de una zona
-- ================================================================
CREATE TABLE public.seats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id       UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  section       TEXT NOT NULL,           -- Ej: 'A', 'B', 'C'
  row_label     TEXT NOT NULL,           -- Ej: 'F1', 'F2'
  seat_number   TEXT NOT NULL,           -- Ej: '01', '02'
  is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, section, row_label, seat_number)
);

-- ================================================================
-- 6. PARTIDOS / EVENTOS
-- ================================================================
CREATE TABLE public.matches (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_id      UUID NOT NULL REFERENCES public.teams(id),
  away_team_id      UUID NOT NULL REFERENCES public.teams(id),
  venue_id          UUID NOT NULL REFERENCES public.venues(id),
  match_date        DATE NOT NULL,
  match_time        TIME NOT NULL,
  day_of_week       TEXT,               -- Ej: 'VIERNES'
  season            TEXT,               -- Ej: '2025'
  competition       TEXT,               -- Ej: 'Liga TDP'
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 7. INVENTARIO DE BOLETOS POR PARTIDO Y ZONA
--    Lleva el control de disponibilidad
-- ================================================================
CREATE TABLE public.match_zone_inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  zone_id         UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  price_override  NUMERIC(10,2),        -- Si el precio varía por partido
  available_seats INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, zone_id)
);

-- ================================================================
-- 8. ÓRDENES DE COMPRA
-- ================================================================
CREATE TABLE public.orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,                  -- Ej: 'card', 'oxxo', 'transfer'
  payment_ref   TEXT,                   -- Referencia de pago externa
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 9. BOLETOS
--    Un registro por cada boleto individual comprado
-- ================================================================
CREATE TABLE public.tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  match_id      UUID NOT NULL REFERENCES public.matches(id),
  seat_id       UUID REFERENCES public.seats(id),  -- NULL si la zona es general (sin asiento fijo)
  zone_id       UUID NOT NULL REFERENCES public.zones(id),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  price         NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'activo'
                  CHECK (status IN ('activo', 'usado', 'expirado', 'cancelado')),
  qr_code       TEXT UNIQUE,            -- Código QR único
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 10. CARRITO DE COMPRA
--     Items temporales antes de confirmar la orden
-- ================================================================
CREATE TABLE public.cart_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id      UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  zone_id       UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  seat_id       UUID REFERENCES public.seats(id),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- ================================================================
-- 11. PATROCINADORES
-- ================================================================
CREATE TABLE public.sponsors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  logo_url      TEXT,
  website_url   TEXT,
  tier          TEXT NOT NULL DEFAULT 'silver'
                  CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- ÍNDICES DE RENDIMIENTO
-- ================================================================
CREATE INDEX idx_matches_date         ON public.matches(match_date);
CREATE INDEX idx_matches_home_team    ON public.matches(home_team_id);
CREATE INDEX idx_tickets_order        ON public.tickets(order_id);
CREATE INDEX idx_tickets_user         ON public.tickets(user_id);
CREATE INDEX idx_tickets_match        ON public.tickets(match_id);
CREATE INDEX idx_tickets_status       ON public.tickets(status);
CREATE INDEX idx_orders_user          ON public.orders(user_id);
CREATE INDEX idx_orders_status        ON public.orders(status);
CREATE INDEX idx_cart_user            ON public.cart_items(user_id);
CREATE INDEX idx_cart_expires         ON public.cart_items(expires_at);
CREATE INDEX idx_seats_zone           ON public.seats(zone_id);
CREATE INDEX idx_zones_venue          ON public.zones(venue_id);
CREATE INDEX idx_inventory_match      ON public.match_zone_inventory(match_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_zone_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors             ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Políticas públicas (lectura sin autenticación)
-- ----------------------------------------------------------------
CREATE POLICY "Equipos son públicos"       ON public.teams     FOR SELECT USING (TRUE);
CREATE POLICY "Venues son públicos"        ON public.venues    FOR SELECT USING (TRUE);
CREATE POLICY "Zonas son públicas"         ON public.zones     FOR SELECT USING (TRUE);
CREATE POLICY "Asientos son públicos"      ON public.seats     FOR SELECT USING (TRUE);
CREATE POLICY "Patrocinadores públicos"    ON public.sponsors  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Inventario público"         ON public.match_zone_inventory FOR SELECT USING (TRUE);

-- Solo partidos publicados para usuarios no-admin
CREATE POLICY "Partidos publicados"        ON public.matches   FOR SELECT
  USING (is_published = TRUE OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin','staff')
  ));

-- ----------------------------------------------------------------
-- Políticas de perfil de usuario
-- ----------------------------------------------------------------
CREATE POLICY "Ver propio perfil"          ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Actualizar propio perfil"   ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------
-- Políticas de órdenes
-- ----------------------------------------------------------------
CREATE POLICY "Ver propias órdenes"        ON public.orders FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Crear orden propia"         ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Políticas de boletos
-- ----------------------------------------------------------------
CREATE POLICY "Ver propios boletos"        ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Políticas de carrito
-- ----------------------------------------------------------------
CREATE POLICY "Ver propio carrito"         ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Insertar en carrito"        ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar de carrito"        ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Actualizar carrito"         ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Políticas de administrador (acceso total)
-- ----------------------------------------------------------------
CREATE POLICY "Admin: acceso total perfiles"   ON public.profiles FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total equipos"    ON public.teams FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total venues"     ON public.venues FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total zonas"      ON public.zones FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total asientos"   ON public.seats FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total partidos"   ON public.matches FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total órdenes"    ON public.orders FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total boletos"    ON public.tickets FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Admin: acceso total sponsors"   ON public.sponsors FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ================================================================
-- DATOS INICIALES (SEED)
-- ================================================================

-- Equipo local
INSERT INTO public.teams (name, short_name, city, is_home_team) VALUES
  ('Alacranes de Durango', 'DGO', 'Durango', TRUE);

-- Venue principal
INSERT INTO public.venues (name, city, address, capacity) VALUES
  ('Estadio Zarco', 'Durango', 'Blvd. Francisco Villa, Durango', 8000);

-- Zonas del Estadio Zarco (se necesita el UUID del venue — ajustar en producción)
-- Ejemplo con subconsulta:
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
  ('premium-norte', 'Premium Norte', 350.00, 800,  '#F5C518', 'A'),
  ('general-sur',   'General Sur',   150.00, 2500, '#D32F2F', 'D'),
  ('lateral-este',  'Lateral Este',  200.00, 1200, '#D32F2F', 'B'),
  ('lateral-oeste', 'Lateral Oeste', 200.00, 1200, '#D32F2F', 'C')
) AS z(zone_key, name, price, total_seats, color_hex, gate)
WHERE v.name = 'Estadio Zarco';
