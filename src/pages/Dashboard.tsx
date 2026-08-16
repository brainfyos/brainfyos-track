import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarClock, CheckSquare, MessageSquare, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { DEMAND_STATUSES } from "@/hooks/useDemands";
import { SUGGESTION_TYPE_LABELS } from "@/hooks/useAiSuggestions";

interface Stats {
  openDemands: number;
  upcomingDeadlines: { id: string; title: string; due_at: string; client_name: string | null }[];
  pendingTasks: number;
  pendingSuggestions: { id: string; title: string; suggestion_type: string }[];
}

const STAT_CARDS = [
  { key: "openDemands" as const, label: "Demandas abertas", icon: Briefcase, to: "/demandas" },
  { key: "pendingTasks" as const, label: "Tarefas pendentes", icon: CheckSquare, to: "/tarefas" },
];

export default function Dashboard() {
  const { org, loading: orgLoading } = useOrganization();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    const load = async () => {
      setLoading(true);
      const [demandsRes, deadlinesRes, tasksRes, suggestionsRes] = await Promise.all([
        supabase.from("demands").select("id", { count: "exact", head: true }).eq("organization_id", org.id).neq("status", "completed"),
        supabase
          .from("deadlines")
          .select("id, title, due_at, clients(name)")
          .eq("organization_id", org.id)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("due_at", { ascending: true })
          .limit(5),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id).neq("status", "completed"),
        supabase
          .from("ai_suggestions")
          .select("id, title, suggestion_type")
          .eq("organization_id", org.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        openDemands: demandsRes.count || 0,
        upcomingDeadlines: (deadlinesRes.data || []).map((d: { id: string; title: string; due_at: string; clients: { name: string } | null }) => ({
          id: d.id,
          title: d.title,
          due_at: d.due_at,
          client_name: d.clients?.name ?? null,
        })),
        pendingTasks: tasksRes.count || 0,
        pendingSuggestions: suggestionsRes.data || [],
      });
      setLoading(false);
    };
    load();
  }, [org]);

  if (orgLoading || loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground tracking-tight mb-6">Visão Geral</h1>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {STAT_CARDS.map(({ key, label, icon: Icon, to }) => (
          <Link key={key} to={to} className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-2xl font-semibold text-foreground">{stats[key]}</span>
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" /> Prazos próximos
            </h2>
            <Link to="/prazos" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">Nenhum prazo próximo.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {stats.upcomingDeadlines.map((d) => (
                <div key={d.id} className="px-3 py-2.5 text-sm">
                  <p className="text-foreground font-medium truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.client_name ? `${d.client_name} · ` : ""}{new Date(d.due_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" /> Sugestões de IA aguardando revisão
            </h2>
            <Link to="/inteligencia" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.pendingSuggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">Nenhuma sugestão pendente.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {stats.pendingSuggestions.map((s) => (
                <div key={s.id} className="px-3 py-2.5 text-sm">
                  <p className="text-foreground font-medium truncate">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{SUGGESTION_TYPE_LABELS[s.suggestion_type] || s.suggestion_type}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" /> Conversas
            </h2>
            <Link to="/conversas" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">
            Acompanhe as conversas do WhatsApp em <Link to="/conversas" className="text-primary hover:underline">Conversas</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
