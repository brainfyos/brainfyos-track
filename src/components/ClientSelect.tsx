import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client } from "@/hooks/useClients";

interface ClientSelectProps {
  clients: Client[];
  value: string | null;
  onChange: (clientId: string | null) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function ClientSelect({ clients, value, onChange, placeholder = "Selecione o cliente", allowNone }: ClientSelectProps) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className="bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none__">Sem cliente</SelectItem>}
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
