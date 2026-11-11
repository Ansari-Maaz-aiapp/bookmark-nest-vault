ALTER TABLE public.folders ADD COLUMN share_token text;
ALTER TABLE public.folders ADD CONSTRAINT folders_share_token_len CHECK (share_token IS NULL OR char_length(share_token) BETWEEN 20 AND 64);
CREATE UNIQUE INDEX folders_share_token_key ON public.folders(share_token) WHERE share_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_shared_folder(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'name', f.name,
    'description', f.description,
    'owner', (SELECT p.display_name FROM public.profiles p WHERE p.id = f.user_id),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title', i.title,
        'url', i.url,
        'description', i.description,
        'domain', i.domain,
        'kind', i.kind,
        'image_url', i.image_url,
        'favicon_url', i.favicon_url,
        'content', CASE WHEN i.kind = 'note' THEN i.content END
      ) ORDER BY i.sort_order, i.created_at DESC)
      FROM public.items i
      WHERE i.folder_id = f.id AND i.user_id = f.user_id AND i.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  FROM public.folders f
  WHERE _token IS NOT NULL AND char_length(_token) >= 20 AND f.share_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_folder(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_folder(text) TO anon, authenticated, service_role;