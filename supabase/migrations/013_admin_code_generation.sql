-- Migration: Admin code generation function
-- Allows generating activation codes via Supabase SQL Editor

-- Function to generate a random activation code
CREATE OR REPLACE FUNCTION generate_activation_code(
    p_plan_type VARCHAR DEFAULT 'monthly',
    p_duration_days INTEGER DEFAULT 30,
    p_payment_reference TEXT DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 30  -- Code expires in 30 days if not redeemed
)
RETURNS TABLE(code VARCHAR, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code VARCHAR(12);
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Generate a random 12-char alphanumeric code (XXXXXXXXXXXX, 12 chars to fit VARCHAR(12))
    v_code := UPPER(
        SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 12)
    );
    
    v_expires_at := now() + (p_expires_in_days || ' days')::INTERVAL;
    
    INSERT INTO activation_codes (code, plan_type, duration_days, expires_at, payment_reference)
    VALUES (v_code, p_plan_type, p_duration_days, v_expires_at, p_payment_reference);
    
    RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

-- Function to generate multiple codes at once (batch)
CREATE OR REPLACE FUNCTION generate_batch_codes(
    p_count INTEGER DEFAULT 5,
    p_plan_type VARCHAR DEFAULT 'monthly',
    p_duration_days INTEGER DEFAULT 30
)
RETURNS TABLE(code VARCHAR, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    FOR i IN 1..p_count LOOP
        RETURN QUERY SELECT * FROM generate_activation_code(p_plan_type, p_duration_days);
    END LOOP;
END;
$$;

-- View for easily checking code status from Supabase dashboard
CREATE OR REPLACE VIEW admin_codes_view AS
SELECT 
    ac.code,
    ac.plan_type,
    ac.duration_days || ' días' AS duracion,
    CASE 
        WHEN ac.redeemed_at IS NOT NULL THEN '✅ Canjeado'
        WHEN ac.expires_at < now() THEN '❌ Expirado'
        ELSE '🟡 Disponible'
    END AS estado,
    ac.payment_reference AS referencia_pago,
    ac.redeemed_at AS canjeado_el,
    ac.expires_at AS expira_el,
    ac.created_at AS creado_el
FROM activation_codes ac
ORDER BY ac.created_at DESC;
