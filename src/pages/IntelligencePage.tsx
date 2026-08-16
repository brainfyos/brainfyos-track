import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, X, Eye, Briefcase, MessageSquare, CalendarClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClientSelect } from "@/components/ClientSelect";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients } from "@/hooks/useClients";
import { useAiSuggestions, SUGGESTION_TYPE_LABELS, type AiSuggestion } from "@/hooks/useAiSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function IntelligencePage() {
  const { org, loading: orgLoading } = useOrganization();
  const { clients } = useClients(org?.id);
  const { suggestions, loading, dismissSuggestion, reviewSuggestion } = useAiSuggestions(org?.id, "pending");
  const [reviewing, setReviewing] = useState<AiSuggestion | null>(null);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [reviewDeadline, setReviewDeadline] = useState("");
  const [saving, setSaving] = useState<"demand" | "demand_deadline" | null>(null);

  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name : null);

  const openReview = (s: AiSuggestion) => {
    setReviewing(s);
    setReviewClientId(s.client_id);
    setReviewDeadline(s.suggested_deadline ? s.suggested_deadline.slice(0, 10) : "");
  };

  // deadlineDate is only ever passed when a human explicitly chose to confirm it —
  // never as a side effect of creating the demand.
  const createDemandFromSuggestion = async (suggestion: AiSuggestion, clientId: string, deadlineDate: string | null) => {
    if (!org) return;
    const { data: demand, error: demandError } = await supabase
      .from("demands")
      .insert({
        organization_id: org.id,
        client_id: clientId,
        title: suggestion.title,
        description: suggestion.summary,
        status: "received",
        priority: "medium",
        source: "ai_suggestion",
        conversation_id: suggestion.conversation_id,
      })
      .select()
      .single();
    if (demandError) throw demandError;

    if (deadlineDate) {
      const { error: deadlineError } = await supabase.from("deadlines").insert({
        organization_id: org.id,
        client_id: clientId,
        demand_id: demand.id,
        title: suggestion.title,
        due_at: new Date(deadlineDate).toISOString(),
        source: "ai_suggested",
        status: "confirmed",
        confirmed_by_human: true,
        notes: suggestion.summary,
      });
      if (deadlineError) throw deadlineError;
    }

    await reviewSuggestion(suggestion.id, { status: "accepted", client_id: clientId });
    return demand;
  };

  const handleQuickCreate = async (s: AiSuggestion, confirmDeadline: boolean) => {
    if (!s.client_id) { openReview(s); return; }
    try {
      await createDemandFromSuggestion(s, s.client_id, confirmDeadline ? s.suggested_deadline : null);
      toast.success(confirmDeadline ? "Demanda criada e prazo confirmado!" : "Demanda criada!");
    } catch (err: any) {
      toast.error("Erro ao criar demanda: " + (err.message || "Tente novamente"));
    }
  };

  const handleDialogCreate = async (confirmDeadline: boolean) => {
    if (!reviewing) return;
    if (!reviewClientId) { toast.error("Selecione o cliente"); return; }
    if (confirmDeadline && !reviewDeadline) { toast.error("Informe a data do prazo"); return; }
    setSaving(confirmDeadline ? "demand_deadline" : "demand");
    try {
      await createDemandFromSuggestion(reviewing, reviewClientId, confirmDeadline ? reviewDeadline : null);
      toast.success(confirmDeadline ? "Demanda criada e prazo confirmado!" : "Demanda criada!");
      setReviewing(null);
    } catch (err: any) {
      toast.error("Erro ao criar demanda: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(null);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissSuggestion(id);
    } catch {
      toast.error("Erro ao ignorar sugestão");
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" /> Inteligência
        </h1>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Sugestões geradas pela IA. Nada vira demanda ou prazo sem sua confirmação — prazos jurídicos exigem uma ação explícita separada.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Nenhuma sugestão pendente</h3>
          <p className="text-xs text-muted-foreground">
            Abra uma conversa e clique em "Gerar sugestões de IA" para analisar as mensagens.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[10px] mb-1.5">{SUGGESTION_TYPE_LABELS[s.suggestion_type] || s.suggestion_type}</Badge>
                  <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
                </div>
                {typeof s.confidence === "number" && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(s.confidence * 100)}% confiança</span>
                )}
              </div>
              {s.summary && <p className="text-xs text-muted-foreground mb-3">{s.summary}</p>}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3 flex-wrap">
                {clientName(s.client_id) && <span>Cliente: {clientName(s.client_id)}</span>}
                {s.suggested_deadline && (
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <CalendarClock className="h-3 w-3" /> Prazo sugerido: {new Date(s.suggested_deadline).toLocaleDateString("pt-BR")} — não confirmado
                  </span>
                )}
                <Link to={`/group/${s.conversation_id}`} className="flex items-center gap-1 text-primary hover:underline">
                  <MessageSquare className="h-3 w-3" /> Ver conversa
                </Link>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => handleDismiss(s.id)}>
                  <X className="h-3.5 w-3.5" /> Ignorar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => openReview(s)}>
                  <Eye className="h-3.5 w-3.5" /> Revisar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleQuickCreate(s, false)}>
                  <Briefcase className="h-3.5 w-3.5" /> Criar demanda
                </Button>
                {s.suggested_deadline && (
                  <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleQuickCreate(s, true)}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Criar demanda e confirmar prazo
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar sugestão</DialogTitle>
            <DialogDescription>{reviewing?.title}</DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">{reviewing.summary}</p>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <ClientSelect clients={clients} value={reviewClientId} onChange={setReviewClientId} />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo sugerido pela IA (edite se necessário)</Label>
                <Input type="date" value={reviewDeadline} onChange={(e) => setReviewDeadline(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  Esta data só vira um prazo confirmado se você clicar em "Criar demanda e confirmar prazo".
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={() => handleDialogCreate(false)} disabled={!!saving}>
                  {saving === "demand" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar demanda"}
                </Button>
                <Button className="w-full gap-1.5" onClick={() => handleDialogCreate(true)} disabled={!!saving || !reviewDeadline}>
                  {saving === "demand_deadline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /> Criar demanda e confirmar prazo</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
