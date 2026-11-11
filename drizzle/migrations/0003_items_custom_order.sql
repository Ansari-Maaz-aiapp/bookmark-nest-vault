ALTER TABLE public.items ADD COLUMN IF NOT EXISTS sort_order double precision NOT NULL DEFAULT (-extract(epoch from now()));
UPDATE public.items SET sort_order = -extract(epoch from created_at);
CREATE INDEX IF NOT EXISTS items_user_sort_order_idx ON public.items (user_id, sort_order);
COMMENT ON COLUMN public.items.in_inbox IS 'DEPRECATED: inbox feature removed';
COMMENT ON COLUMN public.items.reading_status IS 'DEPRECATED: reading queue feature removed';