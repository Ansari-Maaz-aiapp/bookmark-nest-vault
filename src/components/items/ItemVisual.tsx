import { FileText, Github, Image as ImageIcon, Link2, NotebookPen, PlayCircle, File, Youtube, FileType2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { faviconFor } from "@/lib/url";
import type { Item } from "@/lib/vault";

export function KindIcon({ kind, domain, className }: { kind: string; domain?: string | null; className?: string }) {
  const c = cn("size-4", className);
  if (kind === "video") return domain?.includes("youtu") ? <Youtube className={c} /> : <PlayCircle className={c} />;
  if (kind === "repo") return <Github className={c} />;
  if (kind === "pdf") return <FileType2 className={c} />;
  if (kind === "image") return <ImageIcon className={c} />;
  if (kind === "note") return <NotebookPen className={c} />;
  if (kind === "doc") return <FileText className={c} />;
  if (kind === "other") return <File className={c} />;
  return <Link2 className={c} />;
}

export function Favicon({ item, className }: { item: Pick<Item, "favicon_url" | "domain" | "kind">; className?: string }) {
  const [failed, setFailed] = useState(0);
  const sources = [item.favicon_url, faviconFor(item.domain)].filter(Boolean) as string[];
  const src = sources[failed];
  if (!src || item.kind === "note")
    return (
      <span className={cn("grid size-5 place-items-center rounded bg-muted text-muted-foreground", className)}>
        <KindIcon kind={item.kind} domain={item.domain} className="size-3" />
      </span>
    );
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed((f) => f + 1)}
      className={cn("size-5 rounded object-contain", className)}
    />
  );
}

export function PreviewImage({ item, className }: { item: Item; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (item.image_url && !broken)
    return (
      <img
        src={item.image_url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn("size-full object-cover", className)}
      />
    );
  return (
    <div className={cn("grid size-full place-items-center bg-gradient-to-br from-accent to-muted text-accent-foreground/60", className)}>
      {item.kind === "note" ? (
        <p className="line-clamp-5 p-4 text-left text-xs leading-relaxed text-muted-foreground">{item.content || item.description}</p>
      ) : (
        <KindIcon kind={item.kind} domain={item.domain} className="size-8" />
      )}
    </div>
  );
}

export function repoParts(url: string | null) {
  try {
    const p = new URL(url ?? "").pathname.split("/").filter(Boolean);
    return { owner: p[0], repo: p[1] };
  } catch {
    return { owner: undefined, repo: undefined };
  }
}
