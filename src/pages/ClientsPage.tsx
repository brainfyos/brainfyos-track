import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Loader2, Users, Building2, User, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients, type Client } from "@/hooks/useClients";
import { toast } from "sonner";

const emptyForm = { name: "", type: "person" as "person" | "company", document: "", email: "", phone: "", notes: "" };

export default function ClientsPage() {
  const { org, loading: orgLoading } = useOrganization();
  const { clients, loading, createClient, updateClient, deleteClient } = useClients(org?.id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      q === "" ||
      c.name.toLowerCase().includes(q) ||
      c.document?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: (c.type as "person" | "company") ?? "person",
      document: c.document ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      document: form.document || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await updateClient(editingId, payload);
        toast.success("Cliente atualizado!");
      } else {
        await createClient(payload);
        toast.success("Cliente criado!");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao salvar cliente: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteClient(deleting.id);
      toast.success("Cliente excluído");
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err.message || "Tente novamente"));
    } finally {
      setDeleting(null);
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
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Clientes</h1>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, documento, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            {clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {clients.length === 0 ? "Cadastre o primeiro cliente do escritório." : "Tente outra busca."}
          </p>
          {clients.length === 0 && (
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {filtered.map((client) => (
            <div key={client.id} className="flex items-center gap-2 pr-2 hover:bg-muted/50 transition-colors group">
              <Link to={`/clientes/${client.id}`} className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {client.type === "company" ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate text-sm group-hover:text-primary transition-colors">
                    {client.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[client.document, client.phone, client.email].filter(Boolean).join(" · ") || "Sem dados de contato"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(client)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(client)}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: "person" | "company") => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Pessoa física</SelectItem>
                    <SelectItem value="company">Pessoa jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Documento</Label>
                <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="CPF ou CNPJ" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@cliente.com" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas sobre o cliente" rows={3} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} será removido. Demandas, tarefas e prazos vinculados também podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
