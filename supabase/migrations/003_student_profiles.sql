-- 003: mandatory mobile number for every new student account.
-- Login stays email + password; the number is only stored (private to the student and admins).
create table if not exists public.student_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  phone      text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  created_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

drop policy if exists student_profiles_read on public.student_profiles;
create policy student_profiles_read on public.student_profiles
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists student_profiles_admin_delete on public.student_profiles;
create policy student_profiles_admin_delete on public.student_profiles
  for delete using (public.is_admin());

grant select, delete on public.student_profiles to authenticated;
revoke insert, update on public.student_profiles from anon, authenticated;

-- Normalise "98765 43210", "+91 98765-43210", "098765..." to +919876543210; null if not an Indian mobile.
create or replace function public.normalize_in_mobile(raw text) returns text
language sql immutable as $$
  select case
    when d ~ '^[6-9][0-9]{9}$' then '+91' || d
    when d ~ '^91[6-9][0-9]{9}$' then '+' || d
    when d ~ '^0[6-9][0-9]{9}$' then '+91' || substr(d, 2)
    else null end
  from (select regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- Runs inside sign-up: a new account without a valid mobile number is refused.
create or replace function public.handle_new_student() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text;
begin
  p := public.normalize_in_mobile(new.raw_user_meta_data->>'phone');
  if p is null then
    raise exception 'A valid 10-digit Indian mobile number is required.';
  end if;
  insert into public.student_profiles (user_id, full_name, email, phone)
  values (new.id, nullif(left(new.raw_user_meta_data->>'full_name', 40), ''), new.email, p)
  on conflict (user_id) do update set phone = excluded.phone, full_name = excluded.full_name, email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_student();
