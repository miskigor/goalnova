-- Jednokratno obriši sav katalog pjesama (Supabase → SQL Editor → Run).
-- FK na videima: selected_music_track_id → NULL (ON DELETE SET NULL).
-- Ne briše datoteke u storage bucketu pitchrusch-music (to ručno ako treba).

DELETE FROM public.music_tracks;
