import { useState } from "react";
import { Plus, Loader2, CheckSquare, Circle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientSelect } from "@/components/ClientSelect";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients } from "@/hooks/useClients";
import { useTasks, TASK_PRIORITIES } from "@/hooks/useTasks";
import { toast } from "sonner";

const emptyForm = { title: "", description: "", client_id: "", priority: "medium", due_at: "" };

export default function TasksPage() {
  const { org, loading: orgLoading } = useOrganization();
  const { clients } = useClients(org?.id);
  const { tasks, loading, createTask, setTaskStatus } = useTasks(org?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name : null);

  const pending = tasks.filter((t) => t.status === "pending");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const completed = tasks.filter((t) => t.status === "completed");

  const toggleComplete = async (id: string, currentStatus: string) => {
    try {
      await setTaskStatus(id, currentStatus === "completed" ? "pending" : "completed");
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description || null,
        client_id: form.client_id || null,
        priority: form.priority,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        status: "pending",
      });
      toast.success("Tarefa criada!");
      setForm(emptyForm);
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao criar tarefa: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const renderList = (list: typeof tasks) => {
    if (list.length === 0) {
      return <p className="text-xs text-muted-foreground py-10 text-center">Nenhuma tarefa aqui.</p>;
    }
    return (
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {list.map((task) => (
          <div key={task.id} className="flex items-start gap-3 px-4 py-3">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => toggleComplete(task.id, task.status)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium text-foreground", task.status === "completed" && "line-through text-muted-foreground")}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {clientName(task.client_id) && (
                  <span className="text-[11px] text-muted-foreground">{clientName(task.client_id)}</span>
                )}
                {task.due_at && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(task.due_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">{TASK_PRIORITIES.find((p) => p.value === task.priority)?.label}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Tarefas</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Nenhuma tarefa ainda</h3>
          <p className="text-xs text-muted-foreground mb-4">Crie tarefas para organizar o trabalho do escritório.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5"><Circle className="h-3.5 w-3.5" /> Pendentes ({pending.length})</TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Em andamento ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Concluídas ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">{renderList(pending)}</TabsContent>
          <TabsContent value="in_progress" className="mt-4">{renderList(inProgress)}</TabsContent>
          <TabsContent value="completed" className="mt-4">{renderList(completed)}</TabsContent>
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="O que precisa ser feito?" />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <ClientSelect clients={clients} value={form.client_id || null} onChange={(v) => setForm({ ...form, client_id: v || "" })} allowNone />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
