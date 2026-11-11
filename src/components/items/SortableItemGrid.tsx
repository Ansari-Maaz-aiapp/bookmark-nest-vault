import { useEffect, useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReorderItems, type Item, type ItemFilter } from "@/lib/vault";
import { ItemCard, ItemGrid, type ViewMode } from "./ItemCard";

const gridClass = (view: ViewMode) =>
  view === "grid" ? "grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "flex flex-col gap-2";

/** Item list where the user drags a handle to set their own order (saved per item). */
export function SortableItemGrid({ items, view, filter, sortable }: { items: Item[]; view: ViewMode; filter: ItemFilter; sortable: boolean }) {
  const [list, setList] = useState(items);
  useEffect(() => setList(items), [items]);
  const save = useReorderItems(filter);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!sortable || items.length < 2) return <ItemGrid items={items} view={view} />;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = list.findIndex((i) => i.id === active.id);
    const to = list.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(next);
    save(list, from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={list.map((i) => i.id)} strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={gridClass(view)}>
          {list.map((i) => <SortableCard key={i.id} item={i} view={view} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({ item, view }: { item: Item; view: ViewMode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const handle = (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      aria-label={`Drag to reorder ${item.title}`}
      onTouchStart={(e) => e.stopPropagation()}
      className={cn(
        "grid touch-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing cursor-grab",
        view === "grid" ? "size-8 border bg-background/90 shadow-card backdrop-blur" : "h-9 w-6 shrink-0",
      )}
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20 opacity-90 [&>*]:shadow-lift")}
    >
      <ItemCard item={item} view={view} handle={handle} />
    </div>
  );
}
