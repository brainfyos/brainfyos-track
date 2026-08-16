import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type TaskItem = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export const TASK_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

export function useTasks(orgId: string | undefined) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!orgId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", orgId)
      .order("due_at", { ascending: true, nullsFirst: false });
    setTasks(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (input: Omit<TaskInsert, "organization_id">) => {
    if (!orgId) throw new Error("Organização não carregada");
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...input, organization_id: orgId })
      .select()
      .single();
    if (error) throw error;
    await fetchTasks();
    return data;
  };

  const updateTask = async (id: string, input: TaskUpdate) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchTasks();
    return data;
  };

  const setTaskStatus = async (id: string, status: string) => {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    return updateTask(id, { status, completed_at });
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    await fetchTasks();
  };

  return { tasks, loading, refetch: fetchTasks, createTask, updateTask, setTaskStatus, deleteTask };
}
