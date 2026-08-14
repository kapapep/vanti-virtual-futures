-- RLS policies evaluate helper functions as the querying role, so authenticated needs EXECUTE
-- on this membership-check helper. It only returns a boolean and leaks no data.
GRANT EXECUTE ON FUNCTION public.is_syndicate_member(uuid, uuid) TO authenticated;