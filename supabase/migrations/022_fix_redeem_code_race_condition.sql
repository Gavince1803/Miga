-- Migration: Corregir condición de carrera en redeem_activation_code()
--
-- Causa raíz: la versión original (012_subscription_system.sql) hace un
-- SELECT para verificar que el código no esté canjeado, y luego un UPDATE
-- separado para marcarlo como canjeado, sin ningún lock ni condición
-- adicional en el UPDATE. Dos llamadas casi simultáneas con el mismo
-- código pueden pasar ambas el SELECT antes de que cualquiera confirme el
-- UPDATE, permitiendo que el mismo código otorgue premium a dos cuentas
-- distintas.
--
-- Fix: reemplaza el SELECT + UPDATE por un único UPDATE ... WHERE
-- redeemed_at IS NULL ... RETURNING. El UPDATE adquiere el row lock antes
-- de evaluar la condición para la segunda transacción concurrente, así
-- que si la primera ya confirmó, la segunda no encuentra ninguna fila que
-- cumpla `redeemed_at IS NULL` y falla de forma segura (NOT FOUND).

CREATE OR REPLACE FUNCTION redeem_activation_code(code_input VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code activation_codes%ROWTYPE;
    v_user_id UUID;
    v_premium_until TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();

    -- Atomically claim the code: only one concurrent caller can win the
    -- redeemed_at IS NULL condition for a given code.
    UPDATE activation_codes
    SET redeemed_at = now(), redeemed_by = v_user_id
    WHERE code = UPPER(code_input)
      AND redeemed_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING * INTO v_code;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Código inválido o ya utilizado');
    END IF;

    v_premium_until := now() + (v_code.duration_days || ' days')::INTERVAL;

    INSERT INTO user_subscriptions (user_id, plan_type, is_premium, premium_until, activated_via)
    VALUES (v_user_id, v_code.plan_type, true, v_premium_until, v_code.id)
    ON CONFLICT (user_id)
    DO UPDATE SET
        plan_type = v_code.plan_type,
        is_premium = true,
        premium_until = GREATEST(user_subscriptions.premium_until, v_premium_until),
        activated_via = v_code.id,
        updated_at = now();

    RETURN json_build_object(
        'success', true,
        'premium_until', v_premium_until,
        'plan_type', v_code.plan_type
    );
END;
$$;
