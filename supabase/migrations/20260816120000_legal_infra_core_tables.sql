-- Jusbrain Legal Infra: core tables (clients, demands, tasks, deadlines, ai_suggestions)
-- Reuses existing organizations / org_members / monitored_groups / messages.
-- RLS follows the same is_org_member() / has_org_role() helpers used elsewhere in this project.

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- clients
-- =========================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'person' check (type in ('person', 'company')),
  document text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_org on public.clients(organization_id);
create index idx_clients_phone on public.clients(phone);
create index idx_clients_document on public.clients(document);

create trigger set_updated_at before update on public.clients
  for each row execute function public.tg_set_updated_at();

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

alter table public.clients enable row level security;

create policy "org members can view clients"
  on public.clients for select
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org members can insert clients"
  on public.clients for insert
  with check (public.is_org_member(auth.uid(), organization_id));

create policy "org members can update clients"
  on public.clients for update
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org admins can delete clients"
  on public.clients for delete
  using (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- =========================================================
-- demands
-- =========================================================
create table public.demands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'received' check (status in ('received', 'analysis', 'in_progress', 'waiting_client', 'review', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'whatsapp', 'ai_suggestion')),
  conversation_id uuid references public.monitored_groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_demands_org on public.demands(organization_id);
create index idx_demands_client on public.demands(client_id);
create index idx_demands_status on public.demands(status);
create index idx_demands_assigned_to on public.demands(assigned_to);
create index idx_demands_conversation on public.demands(conversation_id);

create trigger set_updated_at before update on public.demands
  for each row execute function public.tg_set_updated_at();

grant select, insert, update, delete on public.demands to authenticated;
grant all on public.demands to service_role;

alter table public.demands enable row level security;

create policy "org members can view demands"
  on public.demands for select
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org members can insert demands"
  on public.demands for insert
  with check (public.is_org_member(auth.uid(), organization_id));

create policy "org members can update demands"
  on public.demands for update
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org admins can delete demands"
  on public.demands for delete
  using (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- =========================================================
-- tasks
-- =========================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  demand_id uuid references public.demands(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_tasks_org on public.tasks(organization_id);
create index idx_tasks_client on public.tasks(client_id);
create index idx_tasks_demand on public.tasks(demand_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_assigned_to on public.tasks(assigned_to);
create index idx_tasks_due_at on public.tasks(due_at);

create trigger set_updated_at before update on public.tasks
  for each row execute function public.tg_set_updated_at();

grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

alter table public.tasks enable row level security;

create policy "org members can view tasks"
  on public.tasks for select
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org members can insert tasks"
  on public.tasks for insert
  with check (public.is_org_member(auth.uid(), organization_id));

create policy "org members can update tasks"
  on public.tasks for update
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org admins can delete tasks"
  on public.tasks for delete
  using (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- =========================================================
-- deadlines (always require human confirmation for legal deadlines)
-- =========================================================
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  demand_id uuid references public.demands(id) on delete set null,
  title text not null,
  due_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'ai_suggested')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'missed', 'cancelled')),
  confirmed_by_human boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deadlines_org on public.deadlines(organization_id);
create index idx_deadlines_client on public.deadlines(client_id);
create index idx_deadlines_demand on public.deadlines(demand_id);
create index idx_deadlines_status on public.deadlines(status);
create index idx_deadlines_due_at on public.deadlines(due_at);

create trigger set_updated_at before update on public.deadlines
  for each row execute function public.tg_set_updated_at();

grant select, insert, update, delete on public.deadlines to authenticated;
grant all on public.deadlines to service_role;

alter table public.deadlines enable row level security;

create policy "org members can view deadlines"
  on public.deadlines for select
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org members can insert deadlines"
  on public.deadlines for insert
  with check (public.is_org_member(auth.uid(), organization_id));

create policy "org members can update deadlines"
  on public.deadlines for update
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org admins can delete deadlines"
  on public.deadlines for delete
  using (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- =========================================================
-- ai_suggestions (IA sugere; humano confirma antes de virar Demand/Deadline)
-- =========================================================
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.monitored_groups(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  suggestion_type text not null check (suggestion_type in (
    'possible_demand', 'possible_deadline', 'client_pending', 'office_pending',
    'document_received', 'follow_up', 'urgent_attention'
  )),
  title text not null,
  summary text,
  suggested_deadline timestamptz,
  suggested_owner uuid references auth.users(id) on delete set null,
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1),
  payload jsonb not null default '{}'::jsonb,
  source_message_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index idx_ai_suggestions_org on public.ai_suggestions(organization_id);
create index idx_ai_suggestions_conversation on public.ai_suggestions(conversation_id);
create index idx_ai_suggestions_client on public.ai_suggestions(client_id);
create index idx_ai_suggestions_status on public.ai_suggestions(status);
create index idx_ai_suggestions_type on public.ai_suggestions(suggestion_type);

grant select, insert, update, delete on public.ai_suggestions to authenticated;
grant all on public.ai_suggestions to service_role;

alter table public.ai_suggestions enable row level security;

create policy "org members can view ai suggestions"
  on public.ai_suggestions for select
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org members can insert ai suggestions"
  on public.ai_suggestions for insert
  with check (public.is_org_member(auth.uid(), organization_id));

create policy "org members can update ai suggestions"
  on public.ai_suggestions for update
  using (public.is_org_member(auth.uid(), organization_id));

create policy "org admins can delete ai suggestions"
  on public.ai_suggestions for delete
  using (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- =========================================================
-- link WhatsApp conversations (monitored_groups) to a Client
-- =========================================================
alter table public.monitored_groups
  add column client_id uuid references public.clients(id) on delete set null;

create index idx_monitored_groups_client on public.monitored_groups(client_id);
