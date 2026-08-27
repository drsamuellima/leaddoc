-- DentChat schema for Supabase (run in SQL editor).
-- Local demo uses .data/store.json instead of these tables.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('super_admin', 'clinic_owner', 'clinic_staff');
create type public.subscription_status as enum ('inactive', 'trialing', 'active', 'past_due', 'canceled');
create type public.lead_status as enum ('new', 'contacted', 'booked', 'closed');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text default '',
  primary_color text default '#0f766e',
  welcome_image_url text default '',
  stripe_customer_id text default '',
  stripe_subscription_id text default '',
  subscription_status public.subscription_status not null default 'inactive',
  allow_widget_without_sub boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  role public.user_role not null default 'clinic_owner',
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount_pence integer not null,
  interval text not null default 'month',
  stripe_price_id text default '',
  active boolean not null default true
);

create table public.chatbots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  greeting text not null default '',
  system_prompt text not null default '',
  widget_key text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.chatbot_options (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  label text not null,
  starter_message text not null default '',
  sort_order integer not null default 0
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  title text not null,
  question text not null,
  answer text not null
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  lead_id uuid,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  inquiry text not null,
  status public.lead_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  follow_up_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  lead_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_support_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  organization_id uuid,
  detail text not null default '',
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.chatbots enable row level security;
alter table public.chatbot_options enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.conversations enable row level security;
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_support_notes enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.my_org_id()
returns uuid language sql stable as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- Clinic users: own org. Super admins: all rows.
create policy org_select on public.organizations for select using (id = public.my_org_id() or public.is_super_admin());
create policy org_update on public.organizations for update using (id = public.my_org_id() or public.is_super_admin());
create policy org_all_admin on public.organizations for all using (public.is_super_admin());

create policy profiles_select on public.profiles for select using (
  organization_id = public.my_org_id() or id = auth.uid() or public.is_super_admin()
);
create policy profiles_admin on public.profiles for all using (public.is_super_admin());

create policy chatbots_tenant on public.chatbots for all using (
  organization_id = public.my_org_id() or public.is_super_admin()
);
create policy options_tenant on public.chatbot_options for all using (
  exists (select 1 from public.chatbots c where c.id = chatbot_id and (c.organization_id = public.my_org_id() or public.is_super_admin()))
);
create policy kb_tenant on public.knowledge_items for all using (
  exists (select 1 from public.chatbots c where c.id = chatbot_id and (c.organization_id = public.my_org_id() or public.is_super_admin()))
);
create policy conv_tenant on public.conversations for all using (
  organization_id = public.my_org_id() or public.is_super_admin()
);
create policy leads_tenant on public.leads for all using (
  organization_id = public.my_org_id() or public.is_super_admin()
);
create policy msg_tenant on public.messages for all using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.organization_id = public.my_org_id() or public.is_super_admin()))
);
create policy notif_tenant on public.notifications for all using (
  organization_id = public.my_org_id() or public.is_super_admin()
);
create policy notes_admin on public.admin_support_notes for all using (public.is_super_admin());
create policy audit_admin on public.audit_logs for all using (public.is_super_admin());
create policy plans_read on public.plans for select using (true);
create policy plans_admin on public.plans for all using (public.is_super_admin());
