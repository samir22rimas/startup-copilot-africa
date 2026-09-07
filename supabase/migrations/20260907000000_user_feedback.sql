-- Create user_feedback table
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'feature', 'improvement', 'other')),
  message text not null check (char_length(trim(message)) > 0),
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  page_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_feedback enable row level security;

-- Policies
create policy "Users can insert their own feedback" on public.user_feedback
  for insert with check (user_id = auth.uid());

create policy "Users can view their own feedback" on public.user_feedback
  for select using (user_id = auth.uid());

-- Index for quick lookups
create index if not exists user_feedback_user_id_created_at_idx on public.user_feedback(user_id, created_at desc);
