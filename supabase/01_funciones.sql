CREATE OR REPLACE FUNCTION public.agrolink_get_my_accepted_request_contact(p_request_id uuid)
 RETURNS TABLE(full_name character varying, phone character varying, municipality character varying, department character varying)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    SELECT
        p.full_name,
        p.phone,
        p.municipality,
        p.department

    FROM public.contact_requests AS cr

    INNER JOIN public.profiles AS p
        ON p.id = cr.producer_id

    WHERE cr.id = p_request_id

      -- Solo el comprador propietario de la solicitud
      AND cr.buyer_id = (SELECT auth.uid())

      -- La solicitud debe estar aceptada
      AND cr.status = 'accepted'

      -- El productor debe haber autorizado compartir
      AND cr.phone_share_authorized = TRUE

      -- Verificar que sea productor
      AND p.role = 'producer'

      -- El teléfono debe existir
      AND p.phone IS NOT NULL
      AND pg_catalog.btrim(p.phone) <> ''

      -- Verificar que quien consulta sea comprador
      AND EXISTS (
          SELECT 1
          FROM public.profiles AS buyer
          WHERE buyer.id = (SELECT auth.uid())
            AND buyer.role = 'consumer'
      );

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_get_my_contact_requests()
 RETURNS TABLE(request_id uuid, buyer_name character varying, product_id uuid, product_name text, quantity numeric, unit character varying, price_at_request numeric, message text, status character varying, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    SELECT

        cr.id,

        COALESCE(
            b.full_name,
            'Comprador AGROLINK'
        ),

        cr.product_id,
        cr.product_name,
        cr.quantity,
        cr.unit,
        cr.price_at_request,
        cr.message,
        cr.status,
        cr.created_at

    FROM public.contact_requests AS cr

    LEFT JOIN public.profiles AS b
        ON b.id = cr.buyer_id

    WHERE cr.producer_id = (SELECT auth.uid())

      AND EXISTS (
          SELECT 1
          FROM public.profiles AS p
          WHERE p.id = (SELECT auth.uid())
            AND p.role = 'producer'
      )

    ORDER BY cr.created_at DESC;

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_get_my_producer_profile()
 RETURNS TABLE(id uuid, full_name character varying, phone character varying, role character varying, municipality character varying, department character varying, phone_public boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    SELECT
        p.id,
        p.full_name,
        p.phone,
        p.role,
        p.municipality,
        p.department,
        p.phone_public

    FROM public.profiles AS p

    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'producer';

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_get_my_sent_contact_requests()
 RETURNS TABLE(request_id uuid, producer_name character varying, producer_municipality character varying, producer_department character varying, product_id uuid, product_name text, quantity numeric, unit character varying, price_at_request numeric, message text, status character varying, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    SELECT

        cr.id,

        COALESCE(
            p.full_name,
            'Productor AGROLINK'
        ),

        p.municipality,
        p.department,

        cr.product_id,
        cr.product_name,
        cr.quantity,
        cr.unit,
        cr.price_at_request,
        cr.message,
        cr.status,
        cr.created_at,
        cr.updated_at

    FROM public.contact_requests AS cr

    LEFT JOIN public.profiles AS p
        ON p.id = cr.producer_id
       AND p.role = 'producer'

    WHERE cr.buyer_id = (SELECT auth.uid())

      AND EXISTS (
          SELECT 1
          FROM public.profiles AS b
          WHERE b.id = (SELECT auth.uid())
            AND b.role = 'consumer'
      )

    ORDER BY cr.created_at DESC;

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_get_producer_contact(p_producer_id uuid)
 RETURNS TABLE(full_name character varying, phone character varying, municipality character varying, department character varying)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$

    SELECT
        p.full_name,
        p.phone,
        p.municipality,
        p.department

    FROM public.profiles AS p

    WHERE p.id = p_producer_id

      AND p.role = 'producer'

      AND p.phone_public = true

      AND EXISTS (
          SELECT 1
          FROM public.profiles AS buyer
          WHERE buyer.id = (SELECT auth.uid())
            AND buyer.role = 'consumer'
      );

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.uid() IS NOT NULL THEN

        RAISE EXCEPTION
        'No está permitido cambiar el rol de la cuenta.';

    END IF;

    RETURN NEW;
END;
$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_set_my_phone_public(p_authorized boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

DECLARE
    v_user_id uuid;
    v_phone text;

BEGIN

    -- Identificar usuario autenticado
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.';
    END IF;

    IF p_authorized IS NULL THEN
        RAISE EXCEPTION 'La autorización debe ser verdadera o falsa.';
    END IF;

    -- Consultar teléfono del productor propietario
    SELECT p.phone
    INTO v_phone
    FROM public.profiles AS p
    WHERE p.id = v_user_id
      AND p.role = 'producer';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solo los productores pueden cambiar esta preferencia.';
    END IF;

    -- Verificar que exista teléfono antes de autorizar
    IF p_authorized = true
       AND NULLIF(pg_catalog.btrim(v_phone), '') IS NULL THEN

        RAISE EXCEPTION
        'Debes registrar un teléfono antes de autorizar su publicación.';

    END IF;

    -- Actualizar únicamente el perfil del usuario autenticado
    UPDATE public.profiles AS p
    SET
        phone_public = p_authorized,
        updated_at = pg_catalog.now()
    WHERE p.id = v_user_id
      AND p.role = 'producer';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No fue posible actualizar tu autorización.';
    END IF;

    RETURN p_authorized;

END;

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_update_contact_request_status(p_request_id uuid, p_new_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

DECLARE
    v_user_id uuid;

BEGIN

    -- Identificar productor autenticado
    v_user_id := (SELECT auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.';
    END IF;

    -- Validar estado solicitado
    IF p_new_status IS NULL
       OR p_new_status NOT IN ('accepted', 'rejected') THEN

        RAISE EXCEPTION 'Estado de solicitud no válido.';

    END IF;

    -- Verificar que sea productor
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = v_user_id
          AND p.role = 'producer'
    ) THEN

        RAISE EXCEPTION 'Solo los productores pueden gestionar solicitudes.';

    END IF;

    -- Actualizar exclusivamente una solicitud propia
    -- que todavía esté pendiente
    UPDATE public.contact_requests AS cr

    SET
        status = p_new_status,
        updated_at = pg_catalog.now()

    WHERE cr.id = p_request_id
      AND cr.producer_id = v_user_id
      AND cr.status = 'pending';

    IF NOT FOUND THEN

        RAISE EXCEPTION
        'La solicitud no existe, no te pertenece o ya fue gestionada.';

    END IF;

    RETURN true;

END;

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.agrolink_update_contact_request_status_with_consent(p_request_id uuid, p_new_status text, p_phone_share_authorized boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

DECLARE
    v_user_id UUID;

BEGIN

    v_user_id := (SELECT auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión.';
    END IF;

    IF p_new_status NOT IN ('accepted', 'rejected')
       OR p_new_status IS NULL THEN
        RAISE EXCEPTION 'Estado de solicitud no válido.';
    END IF;

    IF p_phone_share_authorized IS NULL THEN
        RAISE EXCEPTION 'Debes indicar la autorización telefónica.';
    END IF;

    IF p_new_status = 'rejected'
       AND p_phone_share_authorized THEN
        RAISE EXCEPTION
        'Una solicitud rechazada no puede autorizar el contacto.';
    END IF;

    -- Verificar que el usuario sea productor
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = v_user_id
          AND p.role = 'producer'
    ) THEN
        RAISE EXCEPTION
        'Solo los productores pueden gestionar solicitudes.';
    END IF;

    -- Actualizar exclusivamente solicitudes propias pendientes
    UPDATE public.contact_requests AS cr

    SET
        status = p_new_status,

        phone_share_authorized =
            CASE
                WHEN p_new_status = 'accepted'
                THEN p_phone_share_authorized
                ELSE FALSE
            END,

        updated_at = pg_catalog.now()

    WHERE cr.id = p_request_id
      AND cr.producer_id = v_user_id
      AND cr.status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION
        'La solicitud no existe, no te pertenece o ya fue gestionada.';
    END IF;

    RETURN TRUE;

END;

$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        role,
        municipality,
        department
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
            'Usuario AGROLINK'
        ),
        NEW.raw_user_meta_data ->> 'phone',
        CASE
            WHEN NEW.raw_user_meta_data ->> 'role'
                 IN ('producer', 'consumer')
            THEN NEW.raw_user_meta_data ->> 'role'
            ELSE 'consumer'
        END,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data ->> 'municipality', ''),
            'Cumaral'
        ),
        COALESCE(
            NULLIF(NEW.raw_user_meta_data ->> 'department', ''),
            'Meta'
        )
    );

    RETURN NEW;
END;
$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'No está permitido modificar el rol.';
    END IF;

    RETURN NEW;
END;
$function$;

-- ==========================================

CREATE OR REPLACE FUNCTION public.protect_order_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.consumer_id IS DISTINCT FROM OLD.consumer_id
       OR NEW.producer_id IS DISTINCT FROM OLD.producer_id
       OR NEW.total IS DISTINCT FROM OLD.total THEN
        RAISE EXCEPTION 'No está permitido modificar los datos base del pedido.';
    END IF;

    IF auth.uid() = OLD.consumer_id THEN
        IF OLD.status <> 'pending' OR NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'El consumidor solo puede cancelar pedidos pendientes.';
        END IF;

    ELSIF auth.uid() = OLD.producer_id THEN
        IF NEW.status IS DISTINCT FROM OLD.status
           AND NOT (
             (OLD.status = 'pending'
              AND NEW.status IN ('confirmed', 'cancelled'))
             OR
             (OLD.status = 'confirmed'
              AND NEW.status IN ('completed', 'cancelled'))
           ) THEN
            RAISE EXCEPTION 'Transición de estado no permitida.';
        END IF;

    ELSE
        RAISE EXCEPTION 'No autorizado para modificar este pedido.';
    END IF;

    RETURN NEW;
END;
$function$;