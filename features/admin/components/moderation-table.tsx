"use client";

import { useActionState, type FormEvent } from "react";

import {
  hideReview,
  hideVisit,
  restoreReview,
  restoreVisit,
  type ModerationActionState,
} from "../moderation-actions";
import { ModerationEvidence } from "./moderation-evidence";

const INITIAL_MODERATION_ACTION_STATE: ModerationActionState = {
  message: "",
  status: "idle",
};

export type ModerationRow = {
  contentType: "review" | "visit";
  createdAt: string;
  displayName: string;
  evidenceType: "instagram" | "photo";
  evidenceUrl: string | null;
  hidden: boolean;
  id: string;
  parentVisitHidden: boolean;
  preview: string;
  restaurantName: string;
};

type ModerationTableProps = {
  rows: ModerationRow[];
};

function ModerationControl({ row }: { row: ModerationRow }) {
  const action =
    row.contentType === "visit"
      ? row.hidden
        ? restoreVisit
        : hideVisit
      : row.hidden
        ? restoreReview
        : hideReview;
  const [state, formAction, isPending] = useActionState<
    ModerationActionState,
    FormData
  >(action, INITIAL_MODERATION_ACTION_STATE);

  function confirmHide(event: FormEvent<HTMLFormElement>): void {
    if (
      !row.hidden &&
      !window.confirm(
        row.contentType === "visit"
          ? "이 방문 인증과 연결된 리뷰를 공개 화면에서 숨길까요? 데이터는 삭제되지 않습니다."
          : "이 리뷰를 공개 화면에서 숨길까요? 데이터는 삭제되지 않습니다.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="moderation-control">
      <form action={formAction} onSubmit={confirmHide}>
        <input
          name={row.contentType === "visit" ? "visitId" : "reviewId"}
          type="hidden"
          value={row.id}
        />
        <button disabled={isPending} type="submit">
          {isPending ? "변경 중…" : row.hidden ? "공개 복원" : "공개 숨김"}
        </button>
      </form>
      {state.message ? (
        <small
          className={`admin-action-message admin-action-message--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </small>
      ) : null}
    </div>
  );
}

export function ModerationTable({ rows }: ModerationTableProps) {
  if (rows.length === 0) {
    return (
      <p className="admin-empty-state">
        아직 모더레이션할 방문 인증이나 리뷰가 없습니다.
      </p>
    );
  }

  return (
    <div className="moderation-table-wrap">
      <table className="moderation-table">
        <thead>
          <tr>
            <th scope="col">종류</th>
            <th scope="col">맛집 · 작성자</th>
            <th scope="col">인증 · 내용</th>
            <th scope="col">작성 시각</th>
            <th scope="col">상태</th>
            <th scope="col">관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.contentType}-${row.id}`}>
              <td data-label="종류">
                <strong>{row.contentType === "visit" ? "방문" : "리뷰"}</strong>
              </td>
              <td data-label="맛집 · 작성자">
                <strong>{row.restaurantName}</strong>
                <small>{row.displayName}</small>
              </td>
              <td data-label="인증 · 내용">
                <span>{row.evidenceType}</span>
                <small>{row.preview}</small>
                <ModerationEvidence
                  evidenceType={row.evidenceType}
                  evidenceUrl={row.evidenceUrl}
                  restaurantName={row.restaurantName}
                />
              </td>
              <td data-label="작성 시각">
                <time>{row.createdAt}</time>
              </td>
              <td data-label="상태">
                <span
                  className={`admin-status admin-status--${row.hidden ? "archived" : "published"}`}
                >
                  {row.hidden ? "숨김" : "공개"}
                </span>
                {row.contentType === "review" && row.parentVisitHidden ? (
                  <small>방문 인증도 숨김</small>
                ) : null}
              </td>
              <td data-label="관리">
                <ModerationControl row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
