-- Private context-sensitive dictionary cache. Only the authenticated server route can access it.
create table public.document_word_cards (
  document_id uuid not null references public.study_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_index integer not null check (passage_index >= 0),
  side text not null check (side in ('en','target')),
  word text not null check (char_length(word) between 1 and 100),
  card jsonb,
  claim_id uuid not null,
  expires_at timestamptz not null,
  primary key (document_id, passage_index, side, word)
);
create index document_word_cards_user_idx on public.document_word_cards(user_id);
alter table public.document_word_cards enable row level security;
revoke all on public.document_word_cards from public, anon, authenticated;
grant select, insert, update, delete on public.document_word_cards to service_role;
