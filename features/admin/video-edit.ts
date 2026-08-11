// The save RPC keys on the YouTube video ID alone, so it can only ever create or
// replace the row that ID resolves to. A save is safe exactly when that row is the
// row the form is editing: a new video edits nothing and must resolve to nothing,
// and an edit must still resolve to the video it started from. Any other pairing
// would leave the selected video and its restaurant links behind untouched.
export function canReplaceVideoLinks(
  existingVideoId: string | null,
  editingVideoId: string | null,
): boolean {
  return existingVideoId === editingVideoId;
}
