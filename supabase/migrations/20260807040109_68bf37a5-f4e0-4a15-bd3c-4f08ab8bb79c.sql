GRANT EXECUTE ON FUNCTION public.is_app_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_developer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_role_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;