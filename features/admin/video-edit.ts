export function canReplaceVideoLinks(
  existingVideoId: string | null,
  editingVideoId: string | null,
): boolean {
  return existingVideoId === null || existingVideoId === editingVideoId;
}
