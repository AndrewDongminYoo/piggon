"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { saveVideoLinks } from "../video-actions";
import {
  INITIAL_VIDEO_ADMIN_STATE,
  isAllowedYouTubeThumbnail,
  type VideoAdminActionState,
} from "../video-schema";

export type VideoRestaurantOption = {
  id: string;
  name: string;
  region: string;
  status: "archived" | "draft" | "published";
};

export type VideoEditorValue = {
  canonicalUrl: string;
  fetchState: "failed" | "fetched" | "manual" | "pending";
  id: string;
  links: Array<{
    contextNote: string | null;
    restaurantId: string;
    startSeconds: number | null;
  }>;
  thumbnailUrl: string | null;
  title: string | null;
  videoId: string;
};

type VideoFormProps = {
  restaurants: VideoRestaurantOption[];
  videos: VideoEditorValue[];
};

type ClientLink = Omit<VideoEditorValue["links"][number], "startSeconds"> & {
  clientKey: string;
  startSeconds: number | string | null;
};

type MetadataResponse = {
  fetchState: "failed" | "fetched";
  thumbnailUrl: string;
  title: string;
  videoId: string;
};

function withClientKeys(
  links: VideoEditorValue["links"],
  prefix: string,
): ClientLink[] {
  return links.map((link, index) => ({
    ...link,
    clientKey: `${prefix}-${index}`,
  }));
}

function parseSnapshotLinks(value: string | undefined): ClientLink[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? withClientKeys(parsed as VideoEditorValue["links"], "restored-link")
      : null;
  } catch {
    return null;
  }
}

function ActionMessage({ state }: { state: VideoAdminActionState }) {
  return state.message ? (
    <p
      className={`admin-action-message admin-action-message--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <small className="form-field-error">{errors[0]}</small>
  ) : null;
}

export function VideoForm({ restaurants, videos }: VideoFormProps) {
  const router = useRouter();
  async function submitVideo(
    previousState: VideoAdminActionState,
    formData: FormData,
  ) {
    const nextState = await saveVideoLinks(previousState, formData);
    if (nextState.status === "success") {
      router.refresh();
    }
    return nextState;
  }

  const [state, action, isPending] = useActionState(
    submitVideo,
    INITIAL_VIDEO_ADMIN_STATE,
  );
  const snapshot = state.formValues;
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [youtubeUrl, setYouTubeUrl] = useState(snapshot?.youtubeUrl ?? "");
  const [title, setTitle] = useState(snapshot?.title ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    snapshot?.thumbnailUrl ?? "",
  );
  const [fetchState, setFetchState] = useState<VideoEditorValue["fetchState"]>(
    (snapshot?.fetchState as VideoEditorValue["fetchState"] | undefined) ??
      "pending",
  );
  const [links, setLinks] = useState<ClientLink[]>(
    parseSnapshotLinks(snapshot?.links) ?? [],
  );
  const [lookupMessage, setLookupMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookedUpVideoId, setLookedUpVideoId] = useState("");

  const previewVideoId =
    lookedUpVideoId ||
    videos.find((video) => video.id === selectedVideoId)?.videoId;
  const previewUrl =
    previewVideoId && isAllowedYouTubeThumbnail(thumbnailUrl, previewVideoId)
      ? thumbnailUrl
      : null;

  function selectVideo(videoId: string): void {
    setSelectedVideoId(videoId);
    const video = videos.find((candidate) => candidate.id === videoId);
    if (!video) {
      setYouTubeUrl("");
      setTitle("");
      setThumbnailUrl("");
      setFetchState("pending");
      setLinks([]);
      setLookupMessage("");
      setLookedUpVideoId("");
      return;
    }

    setYouTubeUrl(video.canonicalUrl);
    setTitle(video.title ?? "");
    setThumbnailUrl(video.thumbnailUrl ?? "");
    setFetchState(video.fetchState);
    setLinks(withClientKeys(video.links, video.id));
    setLookupMessage("");
    setLookedUpVideoId(video.videoId);
  }

  async function fetchMetadata(): Promise<void> {
    setIsLookingUp(true);
    setLookupMessage("");
    try {
      const response = await fetch(
        `/api/youtube/oembed?url=${encodeURIComponent(youtubeUrl)}`,
      );
      const metadata = (await response.json()) as MetadataResponse;
      setLookedUpVideoId(metadata.videoId);
      if (!response.ok || metadata.fetchState === "failed") {
        setFetchState("failed");
        setTitle("");
        setThumbnailUrl("");
        setLookupMessage(
          response.ok
            ? "메타데이터를 불러오지 못했습니다. 제목과 썸네일을 직접 입력해 주세요."
            : "지원하는 HTTPS YouTube 영상 URL을 확인해 주세요.",
        );
        return;
      }

      setFetchState("fetched");
      setTitle(metadata.title);
      setThumbnailUrl(metadata.thumbnailUrl);
      setLookupMessage("YouTube 메타데이터를 불러왔습니다.");
    } catch {
      setFetchState("failed");
      setTitle("");
      setThumbnailUrl("");
      setLookupMessage(
        "메타데이터를 불러오지 못했습니다. 제목과 썸네일을 직접 입력해 주세요.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  function updateLink(
    clientKey: string,
    field: "contextNote" | "restaurantId" | "startSeconds",
    value: string,
  ): void {
    setLinks((current) =>
      current.map((link) =>
        link.clientKey === clientKey
          ? {
              ...link,
              [field]: field === "startSeconds" ? value || null : value,
            }
          : link,
      ),
    );
  }

  return (
    <div className="video-admin-editor">
      <label className="admin-record-picker">
        <span>기존 영상 편집</span>
        <select
          onChange={(event) => selectVideo(event.target.value)}
          value={selectedVideoId}
        >
          <option value="">+ 새 영상 연결</option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title || video.videoId}
            </option>
          ))}
        </select>
      </label>

      <form
        action={action}
        className="restaurant-admin-form"
        onReset={(event) => event.preventDefault()}
      >
        <input name="fetchState" type="hidden" value={fetchState} />
        <input
          name="links"
          type="hidden"
          value={JSON.stringify(
            links.map(({ contextNote, restaurantId, startSeconds }) => ({
              contextNote,
              restaurantId,
              startSeconds,
            })),
          )}
        />

        <section className="admin-form-section">
          <div className="admin-form-section__heading">
            <span>01 / YOUTUBE</span>
            <h2>영상 메타데이터</h2>
          </div>
          <div className="admin-video-url-row">
            <label>
              <span>YouTube URL</span>
              <input
                maxLength={2048}
                name="youtubeUrl"
                onChange={(event) => {
                  setYouTubeUrl(event.target.value);
                  setFetchState("pending");
                  setLookupMessage("");
                  setLookedUpVideoId("");
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                type="url"
                value={youtubeUrl}
              />
              <FieldError errors={state.fieldErrors?.youtubeUrl} />
            </label>
            <button
              disabled={isLookingUp || !youtubeUrl}
              onClick={fetchMetadata}
              type="button"
            >
              {isLookingUp ? "불러오는 중…" : "메타데이터 불러오기"}
            </button>
          </div>
          {lookupMessage ? (
            <p className="admin-form-help" role="status">
              {lookupMessage}
            </p>
          ) : null}
          <div className="admin-video-metadata">
            {previewUrl ? (
              <Image
                alt="YouTube 영상 썸네일"
                height={270}
                src={previewUrl}
                width={480}
              />
            ) : (
              <div className="admin-video-placeholder" aria-hidden="true">
                ▶
              </div>
            )}
            <div className="admin-form-grid">
              <label className="admin-form-grid__wide">
                <span>영상 제목</span>
                <input
                  maxLength={300}
                  name="title"
                  onChange={(event) => setTitle(event.target.value)}
                  readOnly={fetchState === "fetched"}
                  required
                  value={title}
                />
                <FieldError errors={state.fieldErrors?.title} />
              </label>
              <label className="admin-form-grid__wide">
                <span>썸네일 URL (선택)</span>
                <input
                  maxLength={2048}
                  name="thumbnailUrl"
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  placeholder="https://i.ytimg.com/vi/..."
                  readOnly={fetchState === "fetched"}
                  type="url"
                  value={thumbnailUrl}
                />
                <FieldError errors={state.fieldErrors?.thumbnailUrl} />
              </label>
              <p className="admin-form-help admin-form-grid__wide">
                상태: {fetchState}. 자동 조회가 실패한 경우에만 제목과 YouTube
                썸네일을 직접 보정합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section__heading admin-form-section__heading--action">
            <div>
              <span>02 / RESTAURANTS</span>
              <h2>맛집별 영상 구간</h2>
            </div>
            <button
              disabled={restaurants.length === 0}
              onClick={() =>
                setLinks((current) => [
                  ...current,
                  {
                    clientKey: `link-${crypto.randomUUID()}`,
                    contextNote: null,
                    restaurantId: restaurants[0]?.id ?? "",
                    startSeconds: null,
                  },
                ])
              }
              type="button"
            >
              + 맛집 연결
            </button>
          </div>
          <div className="admin-repeat-list">
            {links.map((link) => (
              <div className="admin-repeat-row" key={link.clientKey}>
                <label>
                  <span>맛집</span>
                  <select
                    onChange={(event) =>
                      updateLink(
                        link.clientKey,
                        "restaurantId",
                        event.target.value,
                      )
                    }
                    value={link.restaurantId}
                  >
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name} · {restaurant.region} ·
                        {restaurant.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>시작 초 (선택)</span>
                  <input
                    max={2_147_483_647}
                    min={0}
                    onChange={(event) =>
                      updateLink(
                        link.clientKey,
                        "startSeconds",
                        event.target.value,
                      )
                    }
                    type="number"
                    value={link.startSeconds ?? ""}
                  />
                </label>
                <label className="admin-repeat-row__wide">
                  <span>영상 속 맥락 (선택)</span>
                  <input
                    maxLength={500}
                    onChange={(event) =>
                      updateLink(
                        link.clientKey,
                        "contextNote",
                        event.target.value,
                      )
                    }
                    placeholder="예: 이짜 소개 구간"
                    value={link.contextNote ?? ""}
                  />
                </label>
                <button
                  className="admin-remove-row"
                  onClick={() =>
                    setLinks((current) =>
                      current.filter(
                        (candidate) => candidate.clientKey !== link.clientKey,
                      ),
                    )
                  }
                  type="button"
                >
                  연결 제거
                </button>
              </div>
            ))}
          </div>
          {links.length === 0 ? (
            <p className="admin-empty-state">
              영상을 공개하려면 맛집을 한 곳 이상 연결해 주세요.
            </p>
          ) : null}
          <FieldError errors={state.fieldErrors?.links} />
        </section>

        <ActionMessage state={state} />
        <footer className="admin-form-actions">
          <button disabled={isPending} type="submit">
            {isPending ? "저장 중…" : "영상과 맛집 연결 저장"}
          </button>
        </footer>
      </form>
    </div>
  );
}
