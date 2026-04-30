-- Add currency preference to profiles table
-- Default to 'VES' (Venezuelan Bolivar) to ensure backward compatibility for all existing users.

ALTER TABLE profiles
ADD COLUMN currency text NOT NULL DEFAULT 'VES';

-- Add a check constraint to ensure only supported currencies are stored
ALTER TABLE profiles
ADD CONSTRAINT valid_currency CHECK (currency IN ('VES', 'USD', 'MXN', 'ARS', 'COP', 'CLP'));
