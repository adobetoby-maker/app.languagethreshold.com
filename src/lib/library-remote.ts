import { readLearningResetId } from "./learning-reset-epoch.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import type { LibraryEntry, BookChapter } from "../state/library-state";
import type { Language } from "../data/languages";
import type { LibraryRemote } from "./library-device";

interface DbRow {
  id: string;
  user_id: string;
  title: string;
  subtitle: string;
  language: string;
  target_label: string;
  flag: string;
  section: string;
  available: boolean;
  chapters: BookChapter[];
  created_at: string;
}

function rowToEntry(row: DbRow): LibraryEntry {
  const chapters = Array.isArray(row.chapters) ? row.chapters : [];
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    language: row.language as Language,
    targetLabel: row.target_label,
    flag: row.flag || "📖",
    section: "custom",
    available: row.available,
    chapters: chapters.length > 0 ? chapters : undefined,
    sentences: chapters[0]?.sentences ?? [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function entryToInsert(entry: LibraryEntry, userId: string) {
  const chapters: BookChapter[] =
    entry.chapters && entry.chapters.length > 0
      ? entry.chapters
      : [{ title: entry.title, sentences: entry.sentences }];
  return {
    id: entry.id,
    user_id: userId,
    learning_reset_id: readLearningResetId(
      typeof window === "undefined" ? null : window.localStorage,
      userId,
    ),
    title: entry.title,
    subtitle: entry.subtitle ?? "",
    language: entry.language,
    target_label: entry.targetLabel,
    flag: entry.flag,
    section: entry.section,
    available: entry.available,
    // Supabase typegen treats jsonb as `Json`. Our shape is JSON-serializable.
    chapters: chapters as unknown as never,
  };
}

/** RLS remains authoritative; cached ownership never authorizes a database operation. */
export function createLibraryRemote(
  client: SupabaseClient<Database>,
  actor: string,
  isCurrentUser: (id: string) => boolean,
): LibraryRemote {
  function current() {
    if (!isCurrentUser(actor)) throw Error("Account changed");
  }
  function own(row: DbRow) {
    current();
    if (row.user_id !== actor) throw Error("Library owner mismatch");
    return rowToEntry(row);
  }
  return {
    async load(signal) {
      current();
      const { data, error } = await client
        .from("library_books")
        .select("*")
        .eq("user_id", actor)
        .order("created_at", { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      current();
      return (data ?? []).map((row) => own(row as unknown as DbRow));
    },
    async put(entry, signal) {
      current();
      // Never overwrite a newer cloud row when retrying a response lost after an insert.
      const { error } = await client
        .from("library_books")
        .upsert(entryToInsert(entry, actor), { onConflict: "id", ignoreDuplicates: true })
        .abortSignal(signal);
      if (error) throw error;
      current();
      const confirmed = await client
        .from("library_books")
        .select("*")
        .eq("user_id", actor)
        .eq("id", entry.id)
        .abortSignal(signal)
        .maybeSingle();
      if (confirmed.error || !confirmed.data) throw Error("Library save could not be confirmed");
      return own(confirmed.data as unknown as DbRow);
    },
    async remove(id, signal) {
      current();
      const { error } = await client
        .from("library_books")
        .delete()
        .eq("id", id)
        .eq("user_id", actor)
        .abortSignal(signal);
      if (error) throw error;
      current();
    },
  };
}
