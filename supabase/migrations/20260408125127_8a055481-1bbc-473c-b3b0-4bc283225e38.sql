
-- Delete all data from tables that reference users
DELETE FROM public.chat_messages;
DELETE FROM public.chat_sessions;
DELETE FROM public.daily_summaries;
DELETE FROM public.context_blocks;
DELETE FROM public.analyses;
DELETE FROM public.org_api_keys;
DELETE FROM public.org_invites;
DELETE FROM public.instance_configs;
DELETE FROM public.whatsapp_instance_secrets;
DELETE FROM public.whatsapp_instances;
DELETE FROM public.evolution_api_configs;
DELETE FROM public.resend_configs;
DELETE FROM public.knowledge_chunks;
DELETE FROM public.knowledge_files;
DELETE FROM public.knowledge_bases;
DELETE FROM public.group_knowledge_bases;
DELETE FROM public.analysis_rules;
DELETE FROM public.messages;
DELETE FROM public.monitored_groups;
DELETE FROM public.contact_profiles;
DELETE FROM public.org_members;
DELETE FROM public.organizations;
DELETE FROM public.profiles;
DELETE FROM public.app_secrets;
DELETE FROM public.webhook_logs;
DELETE FROM public.system_settings;

-- Delete all auth users
DELETE FROM auth.users;
