-- Migration: Add brand primary_color to startups
alter table public.startups
  add column if not exists primary_color text check (
    primary_color is null or primary_color ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
  );

comment on column public.startups.primary_color is 'Primary brand color hex chosen by the founder (e.g. #0B5D45)';

