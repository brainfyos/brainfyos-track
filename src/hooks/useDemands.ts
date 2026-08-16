import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Demand = Tables<"demands">;
export type DemandInsert = TablesInsert<"demands">;
export type DemandUpdate = TablesUpdate<"demands">;

export const DEMAND_STATUSES = [
  { value: "received", label: "Recebida" },
  { value: "analysis", label: "Em análise" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting_client", label: "Aguardando cliente" },
  { value: "review", label: "Revisão" },
  { value: "completed", label: "Concluída" },
] as const;

export const DEMAND_PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

export function useDemands(orgId: string | undefined) {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemands = useCallback(async () => {
    if (!orgId) { setDemands([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("demands")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    setDemands(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchDemands(); }, [fetchDemands]);

  const createDemand = async (input: Omit<DemandInsert, "organization_id">) => {
    if (!orgId) throw new Error("Organização não carregada");
    const { data, error } = await supabase
      .from("demands")
      .insert({ ...input, organization_id: orgId })
      .select()
      .single();
    if (error) throw error;
    await fetchDemands();
    return data;
  };

  const updateDemand = async (id: string, input: DemandUpdate) => {
    const { data, error } = await supabase
      .from("demands")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchDemands();
    return data;
  };

  const moveDemand = async (id: string, status: string) => {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    return updateDemand(id, { status, completed_at });
  };

  const deleteDemand = async (id: string) => {
    const { error } = await supabase.from("demands").delete().eq("id", id);
    if (error) throw error;
    await fetchDemands();
  };

  return { demands, loading, refetch: fetchDemands, createDemand, updateDemand, moveDemand, deleteDemand };
}
