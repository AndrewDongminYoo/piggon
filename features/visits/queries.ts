import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { isOwnedVisitPhotoPath, VISIT_EVIDENCE_BUCKET } from "./storage";

export type VisitReview = {
  body: string;
  id: string;
  rating: number;
  updatedAt: string;
};

export type PublicVisit = {
  displayName: string;
  evidenceType: "photo" | "instagram";
  id: string;
  instagramUrl: string | null;
  photoUrl: string | null;
  review: VisitReview | null;
  visitedOn: string;
};

export type ViewerProfile = {
  displayName: string;
};

export type ViewerVisit = {
  evidenceType: "photo" | "instagram";
  id: string;
  instagramUrl: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  review: VisitReview | null;
  visitedOn: string;
};

export type UserCollectionItem = ViewerVisit & {
  restaurant: {
    id: string;
    name: string;
    region: string;
    slug: string;
  };
};

type VisitRow = {
  evidence_type: "photo" | "instagram";
  id: string;
  instagram_url: string | null;
  photo_path: string | null;
  restaurant_id: string;
  user_id: string;
  visited_on: string;
};

type ReviewRow = {
  body: string;
  id: string;
  rating: number;
  updated_at: string;
  visit_id: string;
};

function mapReview(review: ReviewRow | undefined): VisitReview | null {
  return review
    ? {
        body: review.body,
        id: review.id,
        rating: review.rating,
        updatedAt: review.updated_at,
      }
    : null;
}

export async function createVisitPhotoUrlMap(
  rows: Array<{
    id: string;
    photo_path: string | null;
    restaurant_id: string;
    user_id: string;
  }>,
): Promise<Map<string, string>> {
  const photoRows = rows.filter(
    (
      row,
    ): row is {
      id: string;
      photo_path: string;
      restaurant_id: string;
      user_id: string;
    } =>
      row.photo_path !== null &&
      isOwnedVisitPhotoPath(row.photo_path, row.user_id, row.restaurant_id),
  );
  if (photoRows.length === 0) {
    return new Map();
  }

  const admin = createAdminClient();
  const entries = await Promise.all(
    photoRows.map(async ({ id, photo_path }) => {
      const { data, error } = await admin.storage
        .from(VISIT_EVIDENCE_BUCKET)
        .createSignedUrl(photo_path, 300);
      if (error) {
        console.error("Unable to sign visit evidence", {
          error: error.message,
          visitId: id,
        });
      }
      return [id, error ? null : data.signedUrl] as const;
    }),
  );

  return new Map(
    entries.filter(
      (entry): entry is readonly [string, string] => entry[1] !== null,
    ),
  );
}

export async function getViewerProfile(
  userId: string,
): Promise<ViewerProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load viewer profile", { cause: error });
  }

  return data ? { displayName: data.display_name } : null;
}

export async function getViewerVisit(
  restaurantId: string,
  userId: string,
): Promise<ViewerVisit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, user_id, restaurant_id, visited_on, evidence_type, photo_path, instagram_url",
    )
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load viewer visit", { cause: error });
  }

  if (!data) {
    return null;
  }

  const [{ data: review, error: reviewError }, photoUrls] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, visit_id, rating, body, updated_at")
      .eq("visit_id", data.id)
      .maybeSingle(),
    createVisitPhotoUrlMap([data]),
  ]);

  if (reviewError) {
    throw new Error("Unable to load viewer review", { cause: reviewError });
  }

  return {
    evidenceType: data.evidence_type,
    id: data.id,
    instagramUrl: data.instagram_url,
    photoPath: data.photo_path,
    photoUrl: photoUrls.get(data.id) ?? null,
    review: mapReview(review ?? undefined),
    visitedOn: data.visited_on,
  };
}

export async function getPublicRestaurantCommunity(
  restaurantId: string,
): Promise<PublicVisit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, user_id, restaurant_id, visited_on, evidence_type, photo_path, instagram_url",
    )
    .eq("restaurant_id", restaurantId)
    .eq("hidden", false)
    .order("visited_on", { ascending: false });

  if (error) {
    throw new Error("Unable to load public visits", { cause: error });
  }

  const visits = data as VisitRow[];
  if (visits.length === 0) {
    return [];
  }

  const userIds = [...new Set(visits.map((visit) => visit.user_id))];
  const visitIds = visits.map((visit) => visit.id);
  const [
    { data: profiles, error: profileError },
    { data: reviews, error: reviewError },
    photoUrls,
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", userIds),
    supabase
      .from("reviews")
      .select("id, visit_id, rating, body, updated_at")
      .in("visit_id", visitIds)
      .eq("hidden", false),
    createVisitPhotoUrlMap(visits),
  ]);

  if (profileError || reviewError) {
    throw new Error("Unable to load public visit details", {
      cause: profileError ?? reviewError,
    });
  }

  const profileByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const reviewByVisitId = new Map(
    ((reviews ?? []) as ReviewRow[]).map((review) => [review.visit_id, review]),
  );

  return visits.flatMap((visit) => {
    const displayName = profileByUserId.get(visit.user_id);
    if (!displayName) {
      return [];
    }

    return [
      {
        displayName,
        evidenceType: visit.evidence_type,
        id: visit.id,
        instagramUrl: visit.instagram_url,
        photoUrl: photoUrls.get(visit.id) ?? null,
        review: mapReview(reviewByVisitId.get(visit.id)),
        visitedOn: visit.visited_on,
      },
    ];
  });
}

export async function listUserCollection(
  userId: string,
): Promise<UserCollectionItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(
      `
        id,
        user_id,
        restaurant_id,
        visited_on,
        evidence_type,
        photo_path,
        instagram_url,
        restaurants!inner (
          id,
          slug,
          name,
          region,
          status
        )
      `,
    )
    .eq("user_id", userId)
    .eq("restaurants.status", "published")
    .order("visited_on", { ascending: false });

  if (error) {
    throw new Error("Unable to load user collection", { cause: error });
  }

  type CollectionRow = VisitRow & {
    restaurants: {
      id: string;
      name: string;
      region: string;
      slug: string;
    };
  };

  const visits = data as unknown as CollectionRow[];
  if (visits.length === 0) {
    return [];
  }

  const [{ data: reviews, error: reviewError }, photoUrls] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, visit_id, rating, body, updated_at")
      .in(
        "visit_id",
        visits.map((visit) => visit.id),
      ),
    createVisitPhotoUrlMap(visits),
  ]);

  if (reviewError) {
    throw new Error("Unable to load user reviews", { cause: reviewError });
  }

  const reviewByVisitId = new Map(
    ((reviews ?? []) as ReviewRow[]).map((review) => [review.visit_id, review]),
  );

  return visits.map((visit) => ({
    evidenceType: visit.evidence_type,
    id: visit.id,
    instagramUrl: visit.instagram_url,
    photoPath: visit.photo_path,
    photoUrl: photoUrls.get(visit.id) ?? null,
    restaurant: visit.restaurants,
    review: mapReview(reviewByVisitId.get(visit.id)),
    visitedOn: visit.visited_on,
  }));
}
