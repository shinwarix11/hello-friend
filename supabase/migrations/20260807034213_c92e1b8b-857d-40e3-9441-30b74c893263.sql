
REVOKE EXECUTE ON FUNCTION public.is_app_member(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_developer(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_app_owner(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.app_role_of(uuid, uuid) FROM authenticated, anon, public;
