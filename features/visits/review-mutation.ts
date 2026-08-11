export type ReviewMutation =
  { kind: "delete" } | { body: string; kind: "save"; rating: number };

export function getReviewMutation(input: {
  body: string | null;
  rating: number | null;
}): ReviewMutation {
  if (input.body === null || input.rating === null) {
    return { kind: "delete" };
  }

  return { body: input.body, kind: "save", rating: input.rating };
}
