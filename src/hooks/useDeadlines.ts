import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Deadline = Tables<"deadlines">;
export type DeadlineInsert = TablesInsert<"deadlines">;
export type DeadlineUpdate = TablesUpdate<"deadlines">;

export const DEADLINE_STATUSES = [
  { value: "pending", label: "Pendente de confirmação" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Cumprido" },
  { value: "missed", label: "Perdido" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export function useDeadlines(orgId: string | undefined) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeadlines = useCallback(async () => {
    if (!orgId) { setDeadlines([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("deadlines")
      .select("*")
      .eq("organization_id", orgId)
      .order("due_at", { ascending: true });
    setDeadlines(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchDeadlines(); }, [fetchDeadlines]);

  const createDeadline = async (input: Omit<DeadlineInsert, "organization_id">) => {
    if (!orgId) throw new Error("Organização não carregada");
    const { data, error } = await supabase
      .from("deadlines")
      .insert({ ...input, organization_id: orgId })
      .select()
      .single();
    if (error) throw error;
    await fetchDeadlines();
    return data;
  };

  const updateDeadline = async (id: string, input: DeadlineUpdate) => {
    const { data, error } = await supabase
      .from("deadlines")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchDeadlines();
    return data;
  };

  // Legal deadlines always require an explicit human confirmation step.
  const confirmDeadline = async (id: string) => {
    return updateDeadline(id, { status: "confirmed", confirmed_by_human: true });
  };

  const deleteDeadline = async (id: string) => {
    const { error } = await supabase.from("deadlines").delete().eq("id", id);
    if (error) throw error;
    await fetchDeadlines();
  };

  return { deadlines, loading, refetch: fetchDeadlines, createDeadline, updateDeadline, confirmDeadline, deleteDeadline };
}
