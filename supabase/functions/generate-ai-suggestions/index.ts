import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUGGESTION_TYPES = [
  "possible_demand",
  "possible_deadline",
  "client_pending",
  "office_pending",
  "document_received",
  "follow_up",
  "urgent_attention",
];

const MESSAGE_WINDOW = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Require an authenticated caller — this function must never accept an
    // arbitrary organization_id from the request body without verifying the
    // caller actually belongs to it.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, organization_id } = await req.json();
    if (!conversation_id || !organization_id) {
      throw new Error("conversation_id e organization_id são obrigatórios");
    }

    const { data: callerMember } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("org_id", organization_id)
      .eq("user_id", callerUser.id)
      .maybeSingle();
    if (!callerMember) {
      return new Response(JSON.stringify({ error: "Usuário não pertence a esta organização" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The conversation must belong to the same organization the caller was
    // just verified against — prevents cross-org reads via a guessed UUID.
    const { data: conversation } = await supabaseAdmin
      .from("monitored_groups")
      .select("id, client_id")
      .eq("id", conversation_id)
      .eq("org_id", organization_id)
      .single();

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversa não encontrada nesta organização" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages, error: msgError } = await supabaseAdmin
      .from("messages")
      .select("id, content, sender_name, sent_at")
      .eq("group_id", conversation_id)
      .order("sent_at", { ascending: false })
      .limit(MESSAGE_WINDOW);

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ suggestions_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ordered = [...messages].reverse();
    const validIds = new Set(ordered.map((m) => m.id));
    const formattedMessages = ordered
      .map((m) => `[ID:${m.id}] [${new Date(m.sent_at).toLocaleString("pt-BR")}] ${m.sender_name}: ${m.content}`)
      .join("\n");

    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente jurídico-operacional que analisa conversas de WhatsApp entre um escritório de advocacia e seus clientes/contatos.

Hoje é ${today}.

Sua tarefa: identificar itens que merecem atenção do escritório e propor SUGESTÕES estruturadas. Você NUNCA decide nada sozinho — apenas sugere. Um humano sempre revisa e confirma antes de qualquer ação virar demanda ou prazo oficial.

Tipos de sugestão possíveis:
- possible_demand: uma nova demanda/atividade jurídica que parece necessária (ex: responder notificação, revisar contrato, protocolar petição).
- possible_deadline: um prazo mencionado ou implícito (ex: "até sexta", "em 15 dias"). NUNCA calcule um prazo jurídico com certeza — apenas sugira a data mencionada/inferida, sempre marcando como sugestão.
- client_pending: o cliente está esperando algo do escritório.
- office_pending: o escritório está esperando algo do cliente (documento, informação, assinatura).
- document_received: um documento foi mencionado como enviado/recebido.
- follow_up: conversa que precisa de acompanhamento, sem urgência classificável nos tipos acima.
- urgent_attention: algo urgente que precisa de atenção imediata de um advogado.

IMPORTANTE:
- Cada mensagem tem um identificador único [ID:uuid]. Use esses IDs em "source_message_ids".
- NÃO invente IDs. Use apenas os que aparecem no texto.
- Se uma data for mencionada (ex: "sexta", "dia 20"), converta para uma data ISO aproximada em "suggested_deadline" baseado na data de hoje, mas isso é só uma sugestão — não é um prazo confirmado.
- "confidence" é um número entre 0 e 1 indicando sua confiança na sugestão.
- Ignore conversas puramente sociais, sem conteúdo relevante para o escritório.
- Gere no máximo 5 sugestões, priorizando as mais relevantes/acionáveis.

Responda APENAS com um JSON válido no formato:
{
  "suggestions": [
    {
      "suggestion_type": "possible_demand",
      "title": "Título curto e claro",
      "summary": "Resumo do que foi identificado na conversa",
      "suggested_deadline": "2026-08-21T00:00:00.000Z" ou null,
      "confidence": 0.8,
      "source_message_ids": ["id-1", "id-2"]
    }
  ]
}

Se não houver nada relevante, retorne: {"suggestions": []}`,
          },
          {
            role: "user",
            content: `Analise estas ${ordered.length} mensagens recentes da conversa:\n\n${formattedMessages}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar sugestões de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    interface RawSuggestion {
      suggestion_type: string;
      title: string;
      summary?: string;
      suggested_deadline?: string | null;
      confidence?: number;
      source_message_ids?: string[];
    }

    let parsed: { suggestions?: RawSuggestion[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { suggestions: [] };
    }

    const suggestions = parsed.suggestions || [];
    let created = 0;

    for (const s of suggestions) {
      if (!SUGGESTION_TYPES.includes(s.suggestion_type)) continue;
      if (typeof s.title !== "string" || s.title.trim().length === 0) continue;
      const sourceIds = (s.source_message_ids || []).filter((id: string) => validIds.has(id));

      const { error: insertError } = await supabaseAdmin.from("ai_suggestions").insert({
        organization_id,
        conversation_id,
        client_id: conversation?.client_id || null,
        suggestion_type: s.suggestion_type,
        title: s.title,
        summary: s.summary || null,
        suggested_deadline: s.suggested_deadline || null,
        confidence: typeof s.confidence === "number" ? Math.max(0, Math.min(1, s.confidence)) : null,
        payload: s,
        source_message_ids: sourceIds,
        status: "pending",
      });

      if (!insertError) created++;
      else console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({ suggestions_created: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
