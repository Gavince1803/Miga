-- Create a function to delete the current user's account and all associated data
-- This is required for App Store compliance (Guideline 5.1.1)

create or replace function delete_user_account()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  -- Get the ID of the user executing the function
  current_user_id := auth.uid();

  -- Verify that a user is logged in
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete data from all tables owned by this user
  -- The cascading deletes on foreign keys might handle some of this, 
  -- but explicit deletion is safer and clearer.
  
  -- Delete dependent data (children first)
  delete from recipe_ingredients where recipe_id in (select id from recipes where user_id = current_user_id);
  delete from order_items where order_id in (select id from orders where user_id = current_user_id);
  delete from inventory_movements where inventory_item_id in (select id from inventory_items where user_id = current_user_id);
  
  -- Delete main entities
  delete from recipes where user_id = current_user_id;
  delete from orders where user_id = current_user_id;
  delete from inventory_items where user_id = current_user_id;
  
  -- Finally, delete the user from auth.users
  -- This requires the function to be SECURITY DEFINER to have access to auth schema
  delete from auth.users where id = current_user_id;
end;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
