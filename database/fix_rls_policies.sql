-- ================================================================
-- FIX: Recursión infinita en políticas RLS de profiles
-- ================================================================
-- PROBLEMA: Las políticas que hacen subqueries a profiles
--           desde policies de profiles crean un loop infinito.
-- SOLUCIÓN: Usar (auth.jwt() ->> 'role') para leer el role
--           directamente del token JWT, sin consultar la tabla.
--
-- PREREQUISITO: Debes crear un trigger que sincronice profiles.role
-- al JWT custom claim. Ver instrucciones al final del archivo.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================


-- ----------------------------------------------------------------
-- PASO 1: Eliminar políticas problemáticas de profiles
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admin: acceso total perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Ver propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Actualizar propio perfil" ON public.profiles;

-- ----------------------------------------------------------------
-- PASO 2: Recrear políticas de profiles SIN recursión
--         Usar (auth.uid() = id) solamente — sin subquery a profiles
-- ----------------------------------------------------------------

-- Usuario puede ver su propio perfil
CREATE POLICY "Ver propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuario puede actualizar su propio perfil
CREATE POLICY "Actualizar propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin puede ver TODOS los perfiles
-- (usando el claim 'user_role' del JWT en vez de subquery)
CREATE POLICY "Admin: ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Admin puede modificar TODOS los perfiles
CREATE POLICY "Admin: modificar todos los perfiles"
  ON public.profiles FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');


-- ----------------------------------------------------------------
-- PASO 3: Eliminar y recrear política de partidos (también recursa)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Partidos publicados" ON public.matches;
DROP POLICY IF EXISTS "Admin: acceso total partidos" ON public.matches;

CREATE POLICY "Partidos publicados"
  ON public.matches FOR SELECT
  USING (
    is_published = TRUE
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'staff')
  );

CREATE POLICY "Admin: acceso total partidos"
  ON public.matches FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');


-- ----------------------------------------------------------------
-- PASO 4: Recrear políticas de admin para las demás tablas
--         usando JWT claims en vez de subquery a profiles
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Admin: acceso total equipos"    ON public.teams;
DROP POLICY IF EXISTS "Admin: acceso total venues"     ON public.venues;
DROP POLICY IF EXISTS "Admin: acceso total zonas"      ON public.zones;
DROP POLICY IF EXISTS "Admin: acceso total asientos"   ON public.seats;
DROP POLICY IF EXISTS "Admin: acceso total órdenes"    ON public.orders;
DROP POLICY IF EXISTS "Admin: acceso total boletos"    ON public.tickets;
DROP POLICY IF EXISTS "Admin: acceso total sponsors"   ON public.sponsors;
DROP POLICY IF EXISTS "Admin: gestionar cupones"       ON public.discount_codes;

CREATE POLICY "Admin: acceso total equipos"
  ON public.teams FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total venues"
  ON public.venues FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total zonas"
  ON public.zones FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total asientos"
  ON public.seats FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total órdenes"
  ON public.orders FOR ALL
  USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'user_role') = 'admin'
  )
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total boletos"
  ON public.tickets FOR ALL
  USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'user_role') = 'admin'
  )
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: acceso total sponsors"
  ON public.sponsors FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "Admin: gestionar cupones"
  ON public.discount_codes FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');


-- ================================================================
-- PASO 5: Crear el trigger que escribe 'user_role' en el JWT
--         Esto es lo que hace que auth.jwt() ->> 'user_role' funcione.
--         Supabase permite custom claims via hook en auth.users.
-- ================================================================

-- Función que inyecta el role del perfil en el JWT como custom claim
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims     JSONB;
  user_role  TEXT;
BEGIN
  -- Leer el role desde profiles usando service_role (bypass RLS)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"fan"');
  END IF;

  -- Devolver el evento con los claims actualizados
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Dar permisos al rol supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ================================================================
-- DESPUÉS DE EJECUTAR ESTE SQL:
-- 1. Ve a Supabase Dashboard → Authentication → Hooks
-- 2. Activa "Customize Access Token (JWT) Hook"
-- 3. Selecciona la función: public.custom_access_token_hook
-- 4. Guarda los cambios
-- ================================================================


-- ================================================================
-- PASO 6: Crear admin — ejecutar SOLO después de que el usuario
--         se haya registrado normalmente en la app
-- ================================================================
-- Sustituye 'tu-email@ejemplo.com' con el email del admin:

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com'
-- );

-- ================================================================
-- VERIFICACIÓN: Confirma que no hay más recursión
-- ================================================================
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'profiles';
