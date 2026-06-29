/** Columns for public video grids (explore, rankings pool, profile grid). */
export const GRID_VIDEO_COLUMNS =
  "id,user_id,challenge_id,created_at,thumbnail_url,poster_url,video_url,processed_video_url,source_video_url,selected_music_track_id,city,country" as const;

/** Profile video grid — playback + still frame only. */
export const PROFILE_GRID_VIDEO_COLUMNS =
  "id,user_id,created_at,thumbnail_url,poster_url,video_url,processed_video_url,source_video_url" as const;
