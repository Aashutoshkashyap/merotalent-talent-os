-- Durable, user-addressed event cursor for isolated Neon migration staging.
-- Producers must insert the source row and event in the same transaction.
CREATE TABLE IF NOT EXISTS public.neon_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  kind text NOT NULL CHECK (kind IN ('notification', 'message')),
  source_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT neon_event_conversation_shape CHECK (
    (kind = 'notification' AND conversation_id IS NULL) OR
    (kind = 'message' AND conversation_id IS NOT NULL)
  ),
  UNIQUE (kind, source_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS neon_events_recipient_cursor_idx
  ON public.neon_application_events (recipient_user_id, id);

REVOKE ALL ON public.neon_application_events FROM PUBLIC;
