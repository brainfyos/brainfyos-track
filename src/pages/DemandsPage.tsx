import { useState } from "react";
import { Plus, Search, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/ClientSelect";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients } from "@/hooks/useClients";
import { useDemands, DEMAND_STATUSES, DEMAND_PRIORITIES } from "@/hooks/useDemands";
import { toast } from "sonner";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-destructive/10 text-destructive",
};

const emptyForm = { title: "", description: "", client_id: "", priority: "medium" };

export default function DemandsPage() {
  const { org, loading: orgLoading } = useOrganization();
  const { clients } = useClients(org?.id);
  const { demands, loading, createDemand, moveDemand } = useDemands(org?.id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || "Cliente";

  const filtered = demands.filter((d) => {
    const q = search.toLowerCase();
    return q === "" || d.title.toLowerCase().includes(q) || clientName(d.client_id).toLowerCase().includes(q);
  });

  const byStatus = (status: string) => filtered.filter((d) => d.status === status);

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (!draggedId) return;
    try {
      await moveDemand(draggedId, status);
    } catch (err: any) {
      toast.error("Erro ao mover demanda");
    }
    setDraggedId(null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!form.client_id) { toast.error("Selecione um cliente"); return; }
    setSaving(true);
    try {
      await createDemand({
        title: form.title.trim(),
        description: form.description || null,
        client_id: form.client_id,
        priority: form.priority,
        status: "received",
        source: "manual",
      });
      toast.success("Demanda criada!");
      setForm(emptyForm);
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao criar demanda: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
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
    <div className="p-6 md:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Demandas</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova demanda
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar demanda ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {demands.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center max-w-md mx-auto mt-8">
          <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Nenhuma demanda ainda</h3>
          <p className="text-xs text-muted-foreground mb-4">Crie a primeira demanda ou aguarde sugestões da IA em Inteligência.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nova demanda
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {DEMAND_STATUSES.map((stage) => {
            const items = byStatus(stage.value);
            return (
              <div
                key={stage.value}
                className="flex-shrink-0 w-72 flex flex-col h-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.value)}
              >
                <div className="flex items-center justify-between px-3 py-2.5 rounded-t-lg bg-muted/60 border border-border/50 border-b-0">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{stage.label}</h3>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 rounded-b-lg border border-border/50 bg-muted/20 space-y-2">
                  {items.map((demand) => (
                    <div
                      key={demand.id}
                      draggable
                      onDragStart={() => setDraggedId(demand.id)}
                      className={cn(
                        "p-3 rounded-lg border border-border bg-card cursor-grab hover:border-primary/50 hover:shadow-sm transition-all active:cursor-grabbing",
                        draggedId === demand.id && "opacity-50"
                      )}
                    >
                      <h4 className="text-sm font-medium text-foreground mb-1">{demand.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{clientName(demand.client_id)}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge className={cn("text-[10px] border-0", PRIORITY_COLOR[demand.priority])}>
                          {DEMAND_PRIORITIES.find((p) => p.value === demand.priority)?.label}
                        </Badge>
                        {demand.source === "ai_suggestion" && (
                          <Badge variant="outline" className="text-[10px] text-accent border-accent/30">IA</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-6">Nenhuma demanda</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova demanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Responder notificação extrajudicial" />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <ClientSelect clients={clients} value={form.client_id || null} onChange={(v) => setForm({ ...form, client_id: v || "" })} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMAND_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detalhes da demanda" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar demanda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
