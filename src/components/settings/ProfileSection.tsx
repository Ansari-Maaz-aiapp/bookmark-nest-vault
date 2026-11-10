import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Camera, Folder, Globe, Hash, KeyRound, Link2, Loader2, MapPin, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PROFILE_LIMITS, useAvatar, useProfile, useSaveProfile, type ProfileFields } from "@/lib/profile";
import { statsQuery, useFolders, useTags } from "@/lib/vault";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const providerLabel: Record<string, string> = { google: "Google", email: "Email", lovable: "Lovable" };

const empty: ProfileFields = { display_name: "", headline: "", bio: "", location: "", website: "" };

export function ProfileSection() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user);
  const save = useSaveProfile(user);
  const avatar = useAvatar(user);
  const { data: items = [] } = useQuery(statsQuery);
  const { data: folders = [] } = useFolders();
  const { data: tags = [] } = useTags();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileFields>(empty);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? profile.name ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
    });
  }, [profile]);

  const set = (k: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const providers = ((user?.app_metadata?.providers as string[] | undefined) ?? [user?.app_metadata?.provider as string]).filter(Boolean);
  const initials = (profile?.name ?? user?.email ?? "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const stats = [
    { label: "Saved items", value: items.length, icon: Link2 },
    { label: "Favorites", value: items.filter((i) => i.is_favorite).length, icon: Star },
    { label: "Folders", value: folders.length, icon: Folder },
    { label: "Tags", value: tags.length, icon: Hash },
  ];

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save profile");
    }
  }

  async function onAvatar(file: File | null) {
    try {
      await avatar.mutateAsync({ file, previous: profile?.avatar_url ?? null });
      toast.success(file ? "Photo updated" : "Photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update photo");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Skeleton className="size-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56" /></div></div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar className="size-20 ring-4 ring-primary/15">
            {profile.avatarSrc && <AvatarImage src={profile.avatarSrc} alt={profile.name} className="object-cover" />}
            <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatar.isPending}
            className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow transition hover:scale-105"
            aria-label="Change profile photo"
          >
            {avatar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0] ?? null)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold">{profile.name}</p>
          {profile.headline && <p className="text-sm text-foreground/80">{profile.headline}</p>}
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{profile.location}</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <Globe className="size-3.5" />{new URL(profile.website).hostname.replace(/^www\./, "")}
              </a>
            )}
            <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />Joined {fmtDate(user?.created_at)}</span>
          </div>
        </div>
        {profile.avatar_url && (
          <Button type="button" variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => onAvatar(null)} disabled={avatar.isPending}>
            <Trash2 /> Remove photo
          </Button>
        )}
      </div>

      {profile.bio && <p className="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">{profile.bio}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-background/50 p-3">
            <Icon className="mb-1.5 size-4 text-primary" />
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <dl className="grid gap-3 rounded-xl border p-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Member since</dt><dd className="font-medium">{fmtDate(user?.created_at)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Last sign-in</dt><dd className="font-medium">{fmtDate(user?.last_sign_in_at)}</dd></div>
        <div>
          <dt className="text-xs text-muted-foreground">Signs in with</dt>
          <dd className="inline-flex items-center gap-1 font-medium"><KeyRound className="size-3.5" />{providers.map((p) => providerLabel[p] ?? p).join(", ") || "Email"}</dd>
        </div>
      </dl>

      <form onSubmit={onSave} className="space-y-4 border-t pt-5">
        <h3 className="font-semibold">Edit profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Name</Label>
            <Input id="pf-name" value={form.display_name ?? ""} onChange={set("display_name")} maxLength={PROFILE_LIMITS.display_name} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-headline">Headline</Label>
            <Input id="pf-headline" value={form.headline ?? ""} onChange={set("headline")} maxLength={PROFILE_LIMITS.headline} placeholder="e.g. Product designer & avid reader" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-location">Location</Label>
            <Input id="pf-location" value={form.location ?? ""} onChange={set("location")} maxLength={PROFILE_LIMITS.location} placeholder="City, Country" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-website">Website</Label>
            <Input id="pf-website" value={form.website ?? ""} onChange={set("website")} maxLength={PROFILE_LIMITS.website} placeholder="yoursite.com" inputMode="url" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="pf-bio">Bio</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{(form.bio ?? "").length}/{PROFILE_LIMITS.bio}</span>
          </div>
          <Textarea id="pf-bio" value={form.bio ?? ""} onChange={set("bio")} maxLength={PROFILE_LIMITS.bio} rows={4} placeholder="A few words about you and what you collect" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
