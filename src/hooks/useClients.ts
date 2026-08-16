import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;

export function useClients(orgId: string | undefined) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!orgId) { setClients([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });
    setClients(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const createClient = async (input: Omit<ClientInsert, "organization_id">) => {
    if (!orgId) throw new Error("Organização não carregada");
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...input, organization_id: orgId })
      .select()
      .single();
    if (error) throw error;
    await fetchClients();
    return data;
  };

  const updateClient = async (id: string, input: ClientUpdate) => {
    const { data, error } = await supabase
      .from("clients")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchClients();
    return data;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    await fetchClients();
  };

  return { clients, loading, refetch: fetchClients, createClient, updateClient, deleteClient };
}
