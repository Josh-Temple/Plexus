export type Note = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  body_hash: string | null;
  inbox: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type NoteLink = {
  id: string;
  user_id: string;
  from_note_id: string;
  to_note_id: string;
  reason: string | null;
  created_at: string;
};
