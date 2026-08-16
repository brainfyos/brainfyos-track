import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, User, Loader2, Trash2, MessageSquare, Briefcase, CheckSquare, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients, type Client } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEMAND_STATUSES } from "@/hooks/useDemands";
import { toast } from "sonner";

type Conversation = Pick<Tables<"monitored_groups">, "id" | "name" | "picture_url">;
type Demand = Tables<"demands">;
type TaskRow = Tables<"tasks">;
type Deadline = Tables<"deadlines">;

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { org } = useOrganization();
  const { updateClient, deleteClient } = useClients(org?.id);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", clientId).single();
      setClient(data);
      setLoading(false);

      const [conv, dem, tk, dl] = await Promise.all([
        supabase.from("monitored_groups").select("id, name, picture_url").eq("client_id", clientId),
        supabase.from("demands").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("client_id", clientId).order("due_at", { ascending: true, nullsFirst: false }),
        supabase.from("deadlines").select("*").eq("client_id", clientId).order("due_at", { ascending: true }),
      ]);
      setConversations(conv.data || []);
      setDemands(dem.data || []);
      setTasks(tk.data || []);
      setDeadlines(dl.data || []);
    };
    load();
  }, [clientId]);

  const handleSave = async (patch: Partial<Client>) => {
    if (!client) return;
    setSaving(true);
    try {
      const updated = await updateClient(client.id, patch);
      setClient(updated);
      toast.success("Cliente atualizado");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await deleteClient(client.id);
      toast.success("Cliente excluído");
      navigate("/clientes");
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err.message || "Tente novamente"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-6 text-center text-muted-foreground">Cliente não encontrado.</div>;
  }

  const statusLabel = (status: string) => DEMAND_STATUSES.find((s) => s.value === status)?.label || status;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate("/clientes")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </button>

      <div className="flex items-start justify-between mb-8 pb-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {client.type === "company" ? <Building2 className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{client.name}</h1>
            <p className="text-xs text-muted-foreground">{client.type === "company" ? "Pessoa jurídica" : "Pessoa física"}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. Demandas, tarefas e prazos vinculados a este cliente também podem ser afetados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="space-y-1.5">
          <Label>Documento</Label>
          <Input defaultValue={client.document || ""} onBlur={(e) => handleSave({ document: e.target.value || null })} placeholder="CPF ou CNPJ" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={client.type} onValueChange={(v) => handleSave({ type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="person">Pessoa física</SelectItem>
              <SelectItem value="company">Pessoa jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input defaultValue={client.phone || ""} onBlur={(e) => handleSave({ phone: e.target.value || null })} placeholder="(11) 99999-9999" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input defaultValue={client.email || ""} onBlur={(e) => handleSave({ email: e.target.value || null })} placeholder="email@cliente.com" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Observações {saving && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
          <Textarea defaultValue={client.notes || ""} onBlur={(e) => handleSave({ notes: e.target.value || null })} rows={3} placeholder="Notas internas" />
        </div>
      </div>

      <Tabs defaultValue="conversas">
        <TabsList>
          <TabsTrigger value="conversas" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Conversas ({conversations.length})</TabsTrigger>
          <TabsTrigger value="demandas" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Demandas ({demands.length})</TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Tarefas ({tasks.length})</TabsTrigger>
          <TabsTrigger value="prazos" className="gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Prazos ({deadlines.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="conversas" className="mt-4">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma conversa vinculada a este cliente ainda.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {conversations.map((c) => (
                <Link key={c.id} to={`/group/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" /> {c.name}
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="demandas" className="mt-4">
          {demands.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma demanda para este cliente ainda.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {demands.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-foreground">{d.title}</span>
                  <Badge variant="outline" className="text-xs">{statusLabel(d.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tarefas" className="mt-4">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma tarefa para este cliente ainda.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-foreground">{t.title}</span>
                  <Badge variant="outline" className="text-xs">{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prazos" className="mt-4">
          {deadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhum prazo para este cliente ainda.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-foreground">{d.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(d.due_at).toLocaleDateString("pt-BR")}</span>
                    {!d.confirmed_by_human && <Badge variant="outline" className="text-xs text-accent border-accent/30">Sugerido pela IA</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
