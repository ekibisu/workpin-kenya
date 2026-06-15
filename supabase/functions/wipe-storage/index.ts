// One-shot: empties all objects from listed storage buckets via the Storage API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const buckets = ["media", "dispute-evidence"];
  const result: Record<string, { removed: number; error?: string }> = {};

  const walk = async (bucket: string, prefix: string): Promise<string[]> => {
    const out: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null) {
          out.push(...(await walk(bucket, path)));
        } else {
          out.push(path);
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    return out;
  };

  for (const bucket of buckets) {
    let removed = 0;
    try {
      const paths = await walk(bucket, "");
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) throw error;
        removed += chunk.length;
      }
      result[bucket] = { removed };
    } catch (e) {
      result[bucket] = { removed, error: (e as Error).message };
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
