-- Anza 2.0: read-only "viewer" role.
-- Kept in its own migration because a new enum value cannot be used in the
-- same transaction that adds it.

alter type public.member_role add value if not exists 'viewer';
