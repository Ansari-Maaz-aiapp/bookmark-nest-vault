import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileFields = Pick<ProfileRow, "display_name" | "headline" | "bio" | "location" | "website">;

export const PROFILE_LIMITS = { display_name: 80, headline: 120, bio: 500, location: 80, website: 300 } as const;
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

/** Turns "example.com" into "https://example.com"; returns null for blank, throws for anything that isn't a web address. */
export function normalizeWebsite(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("Website must be a valid web address");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Website must start with http or https");
  if (!url.hostname.includes(".")) throw new Error("Website must be a valid web address");
  return url.toString();
}

/** Trims fields, turns blanks into null and enforces length limits. */
export function cleanProfile(fields: Partial<ProfileFields>): ProfileFields {
  const out = {} as ProfileFields;
  for (const key of ["display_name", "headline", "bio", "location"] as const) {
    const v = (fields[key] ?? "").trim();
    if (v.length > PROFILE_LIMITS[key]) throw new Error(`${labelFor(key)} can be at most ${PROFILE_LIMITS[key]} characters`);
    out[key] = v || null;
  }
  const site = normalizeWebsite(fields.website);
  if (site && site.length > PROFILE_LIMITS.website) throw new Error("Website is too long");
  out.website = site;
  return out;
}

function labelFor(key: keyof ProfileFields) {
  return { display_name: "Name", headline: "Headline", bio: "Bio", location: "Location", website: "Website" }[key];
}

function metaString(user: User | null | undefined, ...keys: string[]) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const k of keys) if (typeof meta[k] === "string" && meta[k]) return meta[k] as string;
  return null;
}

export type Profile = ProfileRow & { avatarSrc: string | null; name: string };

async function resolveAvatar(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export const profileQuery = (user: User | null) =>
  queryOptions({
    queryKey: ["profile", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      const row: ProfileRow = data ?? {
        id: user!.id, display_name: null, headline: null, bio: null, location: null, website: null, avatar_url: null,
        created_at: user!.created_at, updated_at: user!.created_at,
      };
      const avatarSrc = (await resolveAvatar(row.avatar_url)) ?? metaString(user, "avatar_url", "picture");
      const name = row.display_name ?? metaString(user, "full_name", "name") ?? user!.email?.split("@")[0] ?? "You";
      return { ...row, avatarSrc, name };
    },
  });

export function useProfile(user: User | null) {
  return useQuery(profileQuery(user));
}

export function useSaveProfile(user: User | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Partial<ProfileFields>) => {
      const clean = cleanProfile(fields);
      const { error } = await supabase.from("profiles").upsert({ id: user!.id, ...clean });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useAvatar(user: User | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, previous }: { file: File | null; previous: string | null }) => {
      let path: string | null = null;
      if (file) {
        if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
        if (file.size > AVATAR_MAX_BYTES) throw new Error("Image must be 3 MB or smaller");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        path = `${user!.id}/avatar-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
        if (error) throw error;
      }
      const { error } = await supabase.from("profiles").upsert({ id: user!.id, avatar_url: path });
      if (error) throw error;
      if (previous && !/^https?:\/\//.test(previous)) await supabase.storage.from("avatars").remove([previous]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
