import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type AiSuggestion = Tables<"ai_suggestions">;
export type AiSuggestionUpdate = TablesUpdate<"ai_suggestions">;

export const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  possible_demand: "Possível demanda",
  possible_deadline: "Possível prazo",
  client_pending: "Pendência do cliente",
  office_pending: "Pendência do escritório",
  document_received: "Documento recebido",
  follow_up: "Follow-up",
  urgent_attention: "Atenção urgente",
};

export function useAiSuggestions(orgId: string | undefined, status: string = "pending") {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!orgId) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("ai_suggestions")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    const { data } = await query;
    setSuggestions(data || []);
    setLoading(false);
  }, [orgId, status]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const reviewSuggestion = async (id: string, patch: AiSuggestionUpdate) => {
    const { data, error } = await supabase
      .from("ai_suggestions")
      .update({ ...patch, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchSuggestions();
    return data;
  };

  const dismissSuggestion = (id: string) => reviewSuggestion(id, { status: "dismissed" });

  return { suggestions, loading, refetch: fetchSuggestions, reviewSuggestion, dismissSuggestion };
}
