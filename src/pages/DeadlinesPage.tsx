import { useState } from "react";
import { Plus, Loader2, CalendarClock, ShieldCheck, Sparkles, Check, MoreVertical, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientSelect } from "@/components/ClientSelect";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients } from "@/hooks/useClients";
import { useDeadlines } from "@/hooks/useDeadlines";
import { toast } from "sonner";

const emptyForm = { title: "", client_id: "", due_at: "", notes: "" };

function isOverdue(dueAt: string, status: string) {
  return status !== "completed" && status !== "cancelled" && new Date(dueAt).getTime() < Date.now();
}

export default function DeadlinesPage() {
  const { org, loading: orgLoading } = useOrganization();
  const { clients } = useClients(org?.id);
  const { deadlines, loading, createDeadline, confirmDeadline, updateDeadline, deleteDeadline } = useDeadlines(org?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || "Cliente";

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    if (!form.due_at) { toast.error("Informe a data do prazo"); return; }
    setSaving(true);
    try {
      await createDeadline({
        title: form.title.trim(),
        client_id: form.client_id,
        due_at: new Date(form.due_at).toISOString(),
        notes: form.notes || null,
        source: "manual",
        status: "confirmed",
        confirmed_by_human: true,
      });
      toast.success("Prazo criado!");
      setForm(emptyForm);
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao criar prazo: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmDeadline(id);
      toast.success("Prazo confirmado");
    } catch {
      toast.error("Erro ao confirmar prazo");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDeadline(id, { status: "completed" });
      toast.success("Prazo marcado como cumprido");
    } catch {
      toast.error("Erro ao atualizar prazo");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateDeadline(id, { status: "cancelled" });
      toast.success("Prazo cancelado");
    } catch {
      toast.error("Erro ao cancelar prazo");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDeadline(id);
      toast.success("Prazo excluído");
    } catch {
      toast.error("Erro ao excluir prazo");
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const sorted = [...deadlines].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Prazos</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo prazo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Prazos sugeridos pela IA sempre exigem confirmação humana antes de valer.
      </p>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <CalendarClock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Nenhum prazo ainda</h3>
          <p className="text-xs text-muted-foreground mb-4">Cadastre prazos manualmente ou revise sugestões da IA em Inteligência.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Novo prazo
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {sorted.map((d) => {
            const overdue = isOverdue(d.due_at, d.status);
            return (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{clientName(d.client_id)}</span>
                    <span className={cn("text-[11px]", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {new Date(d.due_at).toLocaleDateString("pt-BR")}
                    </span>
                    {!d.confirmed_by_human && (
                      <Badge variant="outline" className="text-[10px] text-accent border-accent/30 gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Sugerido pela IA
                      </Badge>
                    )}
                    {d.status === "completed" && <Badge variant="outline" className="text-[10px]">Cumprido</Badge>}
                    {d.status === "cancelled" && <Badge variant="outline" className="text-[10px]">Cancelado</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!d.confirmed_by_human && d.status === "pending" && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleConfirm(d.id)}>
                      <Check className="h-3.5 w-3.5" /> Confirmar
                    </Button>
                  )}
                  {d.confirmed_by_human && d.status !== "completed" && (
                    <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => handleComplete(d.id)}>
                      Marcar cumprido
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {d.status !== "cancelled" && d.status !== "completed" && (
                        <DropdownMenuItem onClick={() => handleCancel(d.id)}>
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar prazo
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Responder notificação" />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <ClientSelect clients={clients} value={form.client_id || null} onChange={(v) => setForm({ ...form, client_id: v || "" })} />
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar prazo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
