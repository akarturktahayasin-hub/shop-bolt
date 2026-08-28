import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Verify the caller is authenticated.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = await req.json();
    const listId: string | undefined = body?.list_id;
    const email: string | undefined = body?.email;

    if (!listId || !email) {
      return new Response(JSON.stringify({ error: "list_id and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm the caller owns the list.
    const { data: listRow, error: listErr } = await supabase
      .from("shopping_lists")
      .select("user_id")
      .eq("id", listId)
      .maybeSingle();

    if (listErr || !listRow) {
      return new Response(JSON.stringify({ error: "List not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (listRow.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Only the list owner can invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the invitee by email using the admin API.
    const { data: inviteeList, error: lookupErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (lookupErr) {
      return new Response(JSON.stringify({ error: "Could not look up user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitee = (inviteeList.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!invitee) {
      return new Response(
        JSON.stringify({ error: "No account found for that email. Ask them to sign up first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (invitee.id === callerId) {
      return new Response(JSON.stringify({ error: "You can't invite yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert membership (idempotent via unique constraint).
    const { error: insertErr } = await supabase
      .from("list_members")
      .upsert(
        { list_id: listId, user_id: invitee.id, role: "member" },
        { onConflict: "list_id,user_id" },
      );

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Could not add member" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
