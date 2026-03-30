-- ================================================================
-- ALACRANES DE DURANGO — SCHEMA ADDITIONS (PATCH INCREMENTAL)
-- ================================================================
-- Ejecutar en el SQL Editor de Supabase DESPUÉS del schema.sql base.
-- Es seguro ejecutar múltiples veces gracias a IF NOT EXISTS / OR REPLACE.
-- Nota: Los roles ('fan', 'admin', 'staff') se manejan directamente
-- en profiles.role con un CHECK constraint — no se necesita tabla aparte.
-- ================================================================


-- ================================================================
-- 2. COLUMNA paypal_order_id EN orders
--    Necesaria para rastrear la orden de PayPal asociada a cada orden interna
-- ================================================================
DO $$ BEGIN
  ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_orders_paypal
    ON public.orders(paypal_order_id)
    WHERE paypal_order_id IS NOT NULL;
END $$;


-- ================================================================
-- 3. TABLA discount_codes
--    Códigos de descuento para boletos
-- ================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.discount_codes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          TEXT NOT NULL UNIQUE,            -- Código que escribe el usuario (ej: 'VERANO25')
    type          TEXT NOT NULL                    -- 'percentage' o 'fixed'
                    CHECK (type IN ('percentage', 'fixed')),
    value         NUMERIC(10,2) NOT NULL           -- % o MXN fijo
                    CHECK (value > 0),
    description   TEXT,                            -- Descripción interna
    min_purchase  NUMERIC(10,2) NOT NULL DEFAULT 0,-- Compra mínima para aplicarlo
    max_uses      INTEGER,                         -- NULL = ilimitado
    current_uses  INTEGER NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ,                     -- NULL = no expira
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    UUID REFERENCES public.profiles(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_discount_codes_code
    ON public.discount_codes(code);
  CREATE INDEX IF NOT EXISTS idx_discount_codes_active
    ON public.discount_codes(is_active, expires_at);
END $$;

-- Habilitar RLS
DO $$ BEGIN
  ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin: gestionar cupones" ON public.discount_codes;
  CREATE POLICY "Admin: gestionar cupones" ON public.discount_codes FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
END $$;

-- Los usuarios autenticados pueden leer los códigos activos (para validarlos al pagar)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Leer códigos activos" ON public.discount_codes;
  CREATE POLICY "Leer códigos activos" ON public.discount_codes FOR SELECT
    USING (is_active = TRUE AND auth.uid() IS NOT NULL);
END $$;


-- ================================================================
-- 4. TABLA idempotency_keys
--    Control de idempotencia para operaciones críticas (pagos, reservas)
--    Usada por lib/idempotency.ts
-- ================================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key         TEXT NOT NULL UNIQUE,          -- Header Idempotency-Key enviado por el cliente
    response    JSONB NOT NULL,                -- Respuesta cacheada (JSON)
    status_code INTEGER NOT NULL,             -- HTTP status code de la respuesta
    user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ NOT NULL,          -- TTL: 24 horas desde creación
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_idempotency_key
    ON public.idempotency_keys(key);
  CREATE INDEX IF NOT EXISTS idx_idempotency_expires
    ON public.idempotency_keys(expires_at);
END $$;

-- Habilitar RLS — solo el service_role (admin) puede leer/escribir
-- (lib/idempotency.ts usa supabaseAdmin, así que no necesita políticas de usuario)
DO $$ BEGIN
  ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Solo service_role" ON public.idempotency_keys;
  CREATE POLICY "Solo service_role" ON public.idempotency_keys FOR ALL
    USING (FALSE);  -- Negar todo vía RLS; supabaseAdmin bypassa RLS
END $$;


-- ================================================================
-- 5. FUNCIÓN RPC: decrement_inventory
--    Decrementa los asientos disponibles de una zona para un partido.
--    Usada en app/api/paypal/capture-order/route.ts
--    Se ejecuta con SECURITY DEFINER para operar con permisos elevados.
-- ================================================================
CREATE OR REPLACE FUNCTION public.decrement_inventory(
  p_match_id UUID,
  p_zone_id  UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.match_zone_inventory
  SET available_seats = GREATEST(0, available_seats - p_quantity)
  WHERE match_id = p_match_id
    AND zone_id  = p_zone_id;

  -- Si no existía la fila de inventario, crearla con seats negativos protegidos por GREATEST
  IF NOT FOUND THEN
    RAISE WARNING 'Inventario no encontrado para match_id=% zone_id=%', p_match_id, p_zone_id;
  END IF;
END;
$$;


-- ================================================================
-- 6. FUNCIÓN RPC: validate_discount_code
--    Valida y aplica un código de descuento al total de una orden.
--    Retorna el descuento calculado en MXN.
-- ================================================================
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code          TEXT,
  p_cart_total    NUMERIC
)
RETURNS TABLE (
  valid           BOOLEAN,
  discount_amount NUMERIC,
  code_type       TEXT,
  code_value      NUMERIC,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code public.discount_codes%ROWTYPE;
BEGIN
  -- Buscar el código (insensible a mayúsculas)
  SELECT * INTO v_code
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Código no existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, ''::TEXT, 0::NUMERIC, 'Código no válido'::TEXT;
    RETURN;
  END IF;

  -- Código inactivo
  IF NOT v_code.is_active THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, v_code.type, v_code.value, 'Código inactivo'::TEXT;
    RETURN;
  END IF;

  -- Código expirado
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, v_code.type, v_code.value, 'Código expirado'::TEXT;
    RETURN;
  END IF;

  -- Usos agotados
  IF v_code.max_uses IS NOT NULL AND v_code.current_uses >= v_code.max_uses THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, v_code.type, v_code.value, 'Código agotado'::TEXT;
    RETURN;
  END IF;

  -- Compra mínima no alcanzada
  IF p_cart_total < v_code.min_purchase THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, v_code.type, v_code.value,
      ('Compra mínima requerida: $' || v_code.min_purchase || ' MXN')::TEXT;
    RETURN;
  END IF;

  -- Calcular descuento
  DECLARE
    v_discount NUMERIC;
  BEGIN
    IF v_code.type = 'percentage' THEN
      v_discount := ROUND(p_cart_total * (v_code.value / 100.0), 2);
    ELSE
      v_discount := LEAST(v_code.value, p_cart_total); -- No puede superar el total
    END IF;

    -- Incrementar el contador de usos
    UPDATE public.discount_codes
    SET current_uses = current_uses + 1,
        updated_at   = NOW()
    WHERE id = v_code.id;

    RETURN QUERY SELECT TRUE, v_discount, v_code.type, v_code.value, 'Código aplicado'::TEXT;
  END;
END;
$$;


-- ================================================================
-- 7. LIMPIEZA AUTOMÁTICA DE idempotency_keys EXPIRADAS
--    Función llamable como cron job desde Supabase Edge Functions
--    o desde pg_cron si está habilitado.
-- ================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- ================================================================
-- 8. VISTAS ÚTILES (sin cambios en tablas)
-- ================================================================

-- Vista: resumen de boletos por partido
CREATE OR REPLACE VIEW public.v_match_ticket_summary AS
SELECT
  m.id AS match_id,
  m.match_date,
  m.match_time,
  ht.name AS home_team,
  at.name AS away_team,
  v.name AS venue_name,
  COUNT(t.id) FILTER (WHERE t.status IN ('activo','usado')) AS tickets_sold,
  SUM(t.price) FILTER (WHERE t.status IN ('activo','usado')) AS revenue
FROM public.matches m
JOIN public.teams ht ON ht.id = m.home_team_id
JOIN public.teams at ON at.id = m.away_team_id
JOIN public.venues v ON v.id = m.venue_id
LEFT JOIN public.tickets t ON t.match_id = m.id
GROUP BY m.id, m.match_date, m.match_time, ht.name, at.name, v.name;


-- ================================================================
-- FIN DEL PATCH
-- ================================================================
-- Verifica la instalación con:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--   SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
-- ================================================================
