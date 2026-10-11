-- register.tsx sends currency and phone in the signup metadata, but
-- handle_new_user only copied full_name and avatar_url, so every new profile
-- got the column default 'VES' regardless of what the user picked.
-- Existing profiles are intentionally left as they are.
--
-- Anything outside the valid_currency CHECK falls back to 'VES': a trigger
-- error here would abort the whole signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url, phone, currency)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    case
      when new.raw_user_meta_data->>'currency' in ('VES', 'USD', 'MXN', 'ARS', 'COP', 'CLP')
        then new.raw_user_meta_data->>'currency'
      else 'VES'
    end
  );
  return new;
end;
$function$;
