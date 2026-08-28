-- LeadDoc schema for Supabase Postgres.
-- Apply in the SQL editor. The app connects with DATABASE_URL (server-only)
-- and does not use Supabase Auth.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('super_admin', 'clinic_owner', 'clinic_staff');
create type public.subscription_status as enum ('inactive', 'trialing', 'active', 'past_due', 'canceled');
create type public.lead_status as enum ('new', 'contacted', 'booked', 'closed');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text not null default '',
  primary_color text not null default '#0f766e',
  welcome_image_url text not null default '',
  phone text not null default '',
  booking_url text not null default '',
  stripe_customer_id text not null default '',
  stripe_subscription_id text not null default '',
  subscription_status public.subscription_status not null default 'inactive',
  allow_widget_without_sub boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  role public.user_role not null default 'clinic_owner',
  name text not null default '',
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount_pence integer not null,
  interval text not null default 'month',
  stripe_price_id text not null default '',
  active boolean not null default true
);

create table public.chatbots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  greeting text not null default '',
  greetings jsonb not null default '[]'::jsonb,
  system_prompt text not null default '',
  widget_key text unique not null,
  active boolean not null default false,
  accent_color text not null default '',
  panel_color text not null default '#ffffff',
  button_text_color text not null default '#1a1a1a',
  widget_style text not null default 'orbital',
  font_family text not null default 'system',
  surface_color text not null default '#f4f4f0',
  user_bubble_color text not null default '',
  assistant_bubble_color text not null default '#f3f4f6',
  launcher_color text not null default '',
  avatar_name text not null default '',
  avatar_image_url text not null default '',
  phone text not null default '',
  booking_url text not null default '',
  setup_complete boolean not null default false,
  setup jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.chatbot_options (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  label text not null,
  starter_message text not null default '',
  sort_order integer not null default 0,
  action_type text not null default 'lead' check (action_type in ('lead', 'book', 'call')),
  url text not null default ''
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  title text not null,
  question text not null,
  answer text not null
);

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  stages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
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
  treatment text not null default '',
  pipeline_id uuid references public.pipelines(id) on delete set null,
  stage_id text,
  amount_pence integer,
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

create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  body text not null default '',
  due_at timestamptz,
  important boolean not null default false,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.lead_recalls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  due_at timestamptz not null,
  reason text not null default '',
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.support_notes (
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

create table public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null
);

create index profiles_org_idx on public.profiles (organization_id);
create index chatbots_org_idx on public.chatbots (organization_id);
create index chatbots_widget_key_idx on public.chatbots (widget_key);
create index leads_org_idx on public.leads (organization_id);
create index conversations_org_idx on public.conversations (organization_id);
create index messages_conversation_idx on public.messages (conversation_id);
create index password_reset_email_idx on public.password_reset_tokens (email);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.chatbots enable row level security;
alter table public.chatbot_options enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.pipelines enable row level security;
alter table public.conversations enable row level security;
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_recalls enable row level security;
alter table public.support_notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.password_reset_tokens enable row level security;

-- The Next.js server uses DATABASE_URL (table owner / bypasses RLS).
-- Anon and authenticated keys must not read clinic data.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public avatar bucket (run in a Supabase project; skip on plain Postgres).
-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true)
-- on conflict (id) do nothing;
