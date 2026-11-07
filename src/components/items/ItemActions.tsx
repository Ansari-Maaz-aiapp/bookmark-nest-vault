import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen, Copy, ExternalLink, Eye, FolderInput, MoreHorizontal, Pencil, Pin, PinOff, Share2, Star, StarOff, Trash2, Inbox, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordView, useFolders, useInvalidateVault, useTrashItem, useUpdateItem, type Item } from "@/lib/vault";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAddItem } from "@/components/items/AddItemProvider";

export function openItem(item: Item) {
  recordView(item);
  if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
}

export function useItemToggles() {
  const update = useUpdateItem();
  return {
    toggleFavorite: (item: Item) =>
      update.mutate({ id: item.id, patch: { is_favorite: !item.is_favorite }, action: item.is_favorite ? "unfavorited" : "favorited" }),
    togglePin: (item: Item) =>
      update.mutate({
        id: item.id,
        patch: { is_pinned: !item.is_pinned, pin_order: item.is_pinned ? 0 : Date.now() % 1_000_000_000 },
        action: item.is_pinned ? "unpinned" : "pinned",
      }),
    update,
  };
}

function TrashActions({ item }: { item: Item }) {
  const { update } = useItemToggles();
  const invalidate = useInvalidateVault();
  return (
    <span className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="outline" onClick={() => update.mutate({ id: item.id, patch: { deleted_at: null }, action: "restored" })}>
        <RotateCcw /> Restore
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-destructive"
        aria-label="Delete forever"
        onClick={async () => {
          if (!window.confirm(`Delete “${item.title}” forever? This can't be undone.`)) return;
          const { error } = await supabase.from("items").delete().eq("id", item.id);
          if (error) toast.error(error.message);
          else toast.success("Deleted forever");
          invalidate();
        }}
      >
        <Trash2 />
      </Button>
    </span>
  );
}

export function ItemActions({ item, trigger }: { item: Item; trigger?: React.ReactNode }) {
  const navigate = useNavigate();
  const { toggleFavorite, togglePin, update } = useItemToggles();
  const trash = useTrashItem();
  const { data: folders } = useFolders();
  const { openEdit } = useAddItem();

  if (item.deleted_at) return <TrashActions item={item} />;

  async function share() {
    const data = { title: item.title, url: item.url ?? undefined, text: item.description ?? undefined };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* user cancelled */
      }
    } else if (item.url) {
      await navigator.clipboard.writeText(item.url);
      toast.success("Link copied — sharing isn't supported on this device");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${item.title}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        {item.url && (
          <DropdownMenuItem onSelect={() => openItem(item)}>
            <ExternalLink /> Open
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate({ to: "/item/$id", params: { id: item.id } })}>
          <Eye /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openEdit(item)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => togglePin(item)}>
          {item.is_pinned ? <PinOff /> : <Pin />} {item.is_pinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleFavorite(item)}>
          {item.is_favorite ? <StarOff /> : <Star />} {item.is_favorite ? "Remove favorite" : "Favorite"}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <BookOpen className="mr-2 size-4" /> Reading status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(["none", "unread", "reading", "completed"] as const).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => update.mutate({ id: item.id, patch: { reading_status: s }, action: `reading:${s}` })}>
                {item.reading_status === s ? <Check /> : <span className="size-4" />}
                {s === "none" ? "Not in queue" : s[0].toUpperCase() + s.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput className="mr-2 size-4" /> Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-auto">
            <DropdownMenuItem onSelect={() => update.mutate({ id: item.id, patch: { folder_id: null }, action: "moved" })}>
              {!item.folder_id ? <Check /> : <span className="size-4" />} No folder
            </DropdownMenuItem>
            {folders?.map((f) => (
              <DropdownMenuItem key={f.id} onSelect={() => update.mutate({ id: item.id, patch: { folder_id: f.id, in_inbox: false }, action: "moved" })}>
                {item.folder_id === f.id ? <Check /> : <span className="size-4" />} {f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {item.in_inbox && (
          <DropdownMenuItem onSelect={() => update.mutate({ id: item.id, patch: { in_inbox: false }, action: "processed" })}>
            <Inbox /> Mark as processed
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {item.url && (
          <DropdownMenuItem
            onSelect={async () => {
              await navigator.clipboard.writeText(item.url!);
              toast.success("URL copied");
            }}
          >
            <Copy /> Copy URL
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={share}>
          <Share2 /> Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => trash(item)}>
          <Trash2 /> Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
