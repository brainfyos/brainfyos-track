import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarClock, CheckSquare, MessageSquare, Sparkles, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { SUGGESTION_TYPE_LABELS } from "@/hooks/useAiSuggestions";

interface DeadlineRow {
  id: string;
  title: string;
  due_at: string;
  client_name: string | null;
}

interface ConversationAttention {
  id: string;
  name: string;
  pendingCount: number;
}

interface Stats {
  openDemands: number;
  pendingTasks: number;
  overdueTasks: number;
  upcomingDeadlines: DeadlineRow[];
  conversationsNeedingAttention: ConversationAttention[];
  pendingSuggestions: { id: string; title: string; suggestion_type: string }[];
}

function isCritical(dueAt: string) {
  const days = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days < 2; // overdue or due within ~48h
}

export default function Dashboard() {
  const { org, loading: orgLoading } = useOrganization();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    const load = async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();

      const [demandsRes, deadlinesRes, tasksRes, overdueTasksRes, suggestionsRes, groupsRes] = await Promise.all([
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
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id).neq("status", "completed").lt("due_at", nowIso),
        supabase
          .from("ai_suggestions")
          .select("id, title, suggestion_type")
          .eq("organization_id", org.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("monitored_groups").select("id, name").eq("org_id", org.id).eq("is_active", true),
      ]);

      // Conversas que precisam de atenção: perguntas ainda não respondidas na última análise de cada conversa.
      let conversationsNeedingAttention: ConversationAttention[] = [];
      const groups = groupsRes.data || [];
      if (groups.length > 0) {
        const groupIds = groups.map((g) => g.id);
        const { data: analyses } = await supabase
          .from("analyses")
          .select("id, group_id, created_at")
          .in("group_id", groupIds)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        const latestByGroup = new Map<string, string>();
        for (const a of analyses || []) {
          if (!latestByGroup.has(a.group_id)) latestByGroup.set(a.group_id, a.id);
        }

        const analysisIds = Array.from(latestByGroup.values());
        if (analysisIds.length > 0) {
          const { data: blocks } = await supabase
            .from("context_blocks")
            .select("analysis_id")
            .in("analysis_id", analysisIds)
            .eq("is_answered", false);

          const pendingByAnalysis = new Map<string, number>();
          for (const b of blocks || []) {
            pendingByAnalysis.set(b.analysis_id, (pendingByAnalysis.get(b.analysis_id) || 0) + 1);
          }

          conversationsNeedingAttention = groups
            .map((g) => {
              const analysisId = latestByGroup.get(g.id);
              const pendingCount = analysisId ? pendingByAnalysis.get(analysisId) || 0 : 0;
              return { id: g.id, name: g.name, pendingCount };
            })
            .filter((c) => c.pendingCount > 0)
            .sort((a, b) => b.pendingCount - a.pendingCount)
            .slice(0, 5);
        }
      }

      setStats({
        openDemands: demandsRes.count || 0,
        pendingTasks: tasksRes.count || 0,
        overdueTasks: overdueTasksRes.count || 0,
        upcomingDeadlines: (deadlinesRes.data || []).map((d: { id: string; title: string; due_at: string; clients: { name: string } | null }) => ({
          id: d.id,
          title: d.title,
          due_at: d.due_at,
          client_name: d.clients?.name ?? null,
        })),
        conversationsNeedingAttention,
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
      <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">Visão Geral</h1>
      <p className="text-xs text-muted-foreground mb-6">O que precisa da sua atenção hoje.</p>

      {/* Prazos — prioridade máxima */}
      <section className="mb-6">
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
            {stats.upcomingDeadlines.map((d) => {
              const critical = isCritical(d.due_at);
              return (
                <div key={d.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.client_name ? `${d.client_name} · ` : ""}{new Date(d.due_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {critical && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5 shrink-0">
                      <AlertTriangle className="h-3 w-3" /> Crítico
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tarefas + Demandas — status operacional */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/tarefas" className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-2xl font-semibold text-foreground">{stats.pendingTasks}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tarefas pendentes
            {stats.overdueTasks > 0 && <span className="text-destructive font-medium"> · {stats.overdueTasks} atrasada{stats.overdueTasks > 1 ? "s" : ""}</span>}
          </p>
        </Link>
        <Link to="/demandas" className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-2xl font-semibold text-foreground">{stats.openDemands}</span>
          </div>
          <p className="text-xs text-muted-foreground">Demandas abertas</p>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" /> Conversas que precisam de atenção
            </h2>
            <Link to="/conversas" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.conversationsNeedingAttention.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">Nenhuma conversa com pendências no momento.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {stats.conversationsNeedingAttention.map((c) => (
                <Link key={c.id} to={`/group/${c.id}`} className="px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors">
                  <p className="text-foreground font-medium truncate">{c.name}</p>
                  <span className="text-[10px] text-accent font-medium shrink-0">{c.pendingCount} pendente{c.pendingCount > 1 ? "s" : ""}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" /> Sugestões da IA aguardando revisão
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
      </div>
    </div>
  );
}
