import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isValidShareToken, type SharedFolder } from "./share";

/** Public: anyone with the link can read a folder its owner chose to share. */
export const getSharedFolder = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => ({ token: String(input?.token ?? "").slice(0, 64) }))
  .handler(async ({ data }): Promise<SharedFolder | null> => {
    if (!isValidShareToken(data.token)) return null;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: folder, error } = await sb.rpc("get_shared_folder", { _token: data.token });
    if (error) throw new Error("Couldn't load this shared folder");
    return (folder as SharedFolder | null) ?? null;
  });
