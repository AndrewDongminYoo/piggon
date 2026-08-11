"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  archiveRestaurant,
  restoreRestaurant,
  saveRestaurant,
} from "../restaurant-actions";
import {
  INITIAL_RESTAURANT_ADMIN_STATE,
  type RestaurantAdminActionState,
  type RestaurantAdminInput,
} from "../restaurant-schema";
import {
  KakaoPlacePicker,
  type KakaoPlaceSelection,
} from "@/features/restaurants/components/kakao-place-picker";

import { getNextPlaceSource } from "../place-source";

export type RestaurantFormValue = Omit<RestaurantAdminInput, "intent"> & {
  status: "draft" | "published" | "archived";
};

type RestaurantFormProps = {
  appKey: string;
  initialValue?: RestaurantFormValue;
};

type ClientRow<T> = T & { clientKey: string };

const EMPTY_VALUE: RestaurantFormValue = {
  address: null,
  alternateName: null,
  availabilityPeriods: [],
  awards: [],
  certifications: [],
  description: null,
  id: null,
  kakaoPlaceId: null,
  kind: "pizzeria",
  latitude: null,
  longitude: null,
  name: "",
  region: "",
  slug: "",
  sourceUrl: null,
  status: "draft",
};

function withClientKeys<T>(rows: T[], prefix: string): Array<ClientRow<T>> {
  return rows.map((row, index) => ({
    ...row,
    clientKey: `${prefix}-${index}`,
  }));
}

function withoutClientKeys<T extends { clientKey: string }>(
  rows: T[],
): Array<Omit<T, "clientKey">> {
  return rows.map((row) => {
    const value = { ...row };
    delete (value as Partial<T>).clientKey;
    return value;
  });
}

function parseSnapshotRows<T>(value: string | undefined): T[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <small className="form-field-error">{errors[0]}</small>
  ) : null;
}

function ActionMessage({ state }: { state: RestaurantAdminActionState }) {
  return state.message ? (
    <p
      className={`admin-action-message admin-action-message--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

function RestaurantStatusControls({ value }: { value: RestaurantFormValue }) {
  const router = useRouter();

  async function runStatusAction(
    action: typeof archiveRestaurant,
    previousState: RestaurantAdminActionState,
    formData: FormData,
  ) {
    const state = await action(previousState, formData);
    if (state.status === "success") {
      router.refresh();
    }
    return state;
  }

  const [archiveState, archiveAction, isArchiving] = useActionState(
    runStatusAction.bind(null, archiveRestaurant),
    INITIAL_RESTAURANT_ADMIN_STATE,
  );
  const [restoreState, restoreAction, isRestoring] = useActionState(
    runStatusAction.bind(null, restoreRestaurant),
    INITIAL_RESTAURANT_ADMIN_STATE,
  );

  if (!value.id) {
    return null;
  }

  return (
    <aside className="admin-status-controls">
      <div>
        <span>CURRENT STATUS</span>
        <strong>{value.status}</strong>
      </div>
      {value.status === "archived" ? (
        <form
          action={restoreAction}
          onSubmit={(event) => {
            if (!window.confirm("이 맛집을 비공개 초안으로 복원할까요?")) {
              event.preventDefault();
            }
          }}
        >
          <input name="id" type="hidden" value={value.id} />
          <button disabled={isRestoring} type="submit">
            {isRestoring ? "복원 중…" : "초안으로 복원"}
          </button>
        </form>
      ) : (
        <form
          action={archiveAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "이 맛집을 보관하고 공개 지도에서 숨길까요? 종료된 팝업은 보관 대신 운영기간으로 표시하는 편이 좋습니다.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input name="id" type="hidden" value={value.id} />
          <button disabled={isArchiving} type="submit">
            {isArchiving ? "보관 중…" : "맛집 보관"}
          </button>
        </form>
      )}
      <ActionMessage state={archiveState} />
      <ActionMessage state={restoreState} />
    </aside>
  );
}

export function RestaurantForm({
  appKey,
  initialValue = EMPTY_VALUE,
}: RestaurantFormProps) {
  const router = useRouter();
  async function submitRestaurant(
    previousState: RestaurantAdminActionState,
    formData: FormData,
  ) {
    const nextState = await saveRestaurant(previousState, formData);
    if (nextState.status === "success" && nextState.restaurantId) {
      if (!initialValue.id) {
        router.push(`/admin/restaurants/${nextState.restaurantId}`);
      } else {
        router.refresh();
      }
    }
    return nextState;
  }

  const [state, action, isPending] = useActionState(
    submitRestaurant,
    INITIAL_RESTAURANT_ADMIN_STATE,
  );
  const snapshot = state.formValues;
  const restoredKakaoPlaceId =
    snapshot?.kakaoPlaceId ?? initialValue.kakaoPlaceId ?? "";
  const restoredSourceUrl = snapshot?.sourceUrl ?? initialValue.sourceUrl ?? "";
  const inferredAutoSourceUrl = `https://place.map.kakao.com/${restoredKakaoPlaceId}`;
  const [details, setDetails] = useState({
    alternateName: snapshot?.alternateName ?? initialValue.alternateName ?? "",
    description: snapshot?.description ?? initialValue.description ?? "",
    kind: (snapshot?.kind || initialValue.kind) as RestaurantFormValue["kind"],
    name: snapshot?.name ?? initialValue.name,
    region: snapshot?.region ?? initialValue.region,
    slug: snapshot?.slug ?? initialValue.slug,
  });
  const [source, setSource] = useState({
    autoUrl:
      restoredKakaoPlaceId && restoredSourceUrl === inferredAutoSourceUrl
        ? restoredSourceUrl
        : "",
    url: restoredSourceUrl,
  });
  const [location, setLocation] = useState({
    address: snapshot?.address ?? initialValue.address ?? "",
    kakaoPlaceId: restoredKakaoPlaceId,
    latitude: snapshot?.latitude ?? initialValue.latitude?.toString() ?? "",
    longitude: snapshot?.longitude ?? initialValue.longitude?.toString() ?? "",
    placeName: initialValue.kakaoPlaceId ? initialValue.name : "",
  });
  const [certifications, setCertifications] = useState(
    withClientKeys(
      parseSnapshotRows<RestaurantAdminInput["certifications"][number]>(
        snapshot?.certifications,
      ) ?? initialValue.certifications,
      "certification",
    ),
  );
  const [awards, setAwards] = useState(
    withClientKeys(
      parseSnapshotRows<RestaurantAdminInput["awards"][number]>(
        snapshot?.awards,
      ) ?? initialValue.awards,
      "award",
    ),
  );
  const [availabilityPeriods, setAvailabilityPeriods] = useState(
    withClientKeys(
      parseSnapshotRows<RestaurantAdminInput["availabilityPeriods"][number]>(
        snapshot?.availabilityPeriods,
      ) ?? initialValue.availabilityPeriods,
      "availability",
    ),
  );

  const selectedPlace = useMemo<KakaoPlaceSelection | null>(() => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (
      !location.kakaoPlaceId ||
      !location.address ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return {
      address: location.address,
      kakaoPlaceId: location.kakaoPlaceId,
      latitude,
      longitude,
      name: location.placeName || initialValue.name,
      sourceUrl: source.url,
    };
  }, [initialValue.name, location, source.url]);

  const handlePlaceChange = useCallback((selection: KakaoPlaceSelection) => {
    setLocation({
      address: selection.address,
      kakaoPlaceId: selection.kakaoPlaceId,
      latitude: selection.latitude.toString(),
      longitude: selection.longitude.toString(),
      placeName: selection.name,
    });
    setSource((current) => getNextPlaceSource(current, selection.sourceUrl));
  }, []);

  function confirmPublication(event: FormEvent<HTMLFormElement>): void {
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (
      submitter?.value === "publish" &&
      !window.confirm(
        "주소·좌표·출처와 속성을 확인했습니다. 이 맛집을 공개할까요?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="restaurant-admin-editor">
      <RestaurantStatusControls value={initialValue} />
      <form
        action={action}
        className="restaurant-admin-form"
        onReset={(event) => event.preventDefault()}
        onSubmit={confirmPublication}
      >
        <input name="id" type="hidden" value={initialValue.id ?? ""} />
        <input
          name="certifications"
          type="hidden"
          value={JSON.stringify(withoutClientKeys(certifications))}
        />
        <input
          name="awards"
          type="hidden"
          value={JSON.stringify(withoutClientKeys(awards))}
        />
        <input
          name="availabilityPeriods"
          type="hidden"
          value={JSON.stringify(withoutClientKeys(availabilityPeriods))}
        />

        <section className="admin-form-section">
          <div className="admin-form-section__heading">
            <span>01 / IDENTITY</span>
            <h2>맛집 기본 정보</h2>
          </div>
          <div className="admin-form-grid">
            <label>
              <span>상호명</span>
              <input
                maxLength={160}
                name="name"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                value={details.name}
              />
              <FieldError errors={state.fieldErrors?.name} />
            </label>
            <label>
              <span>다른 이름</span>
              <input
                maxLength={160}
                name="alternateName"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    alternateName: event.target.value,
                  }))
                }
                value={details.alternateName}
              />
            </label>
            <label>
              <span>슬러그</span>
              <input
                maxLength={160}
                name="slug"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="marione-seongsu"
                required
                value={details.slug}
              />
              <FieldError errors={state.fieldErrors?.slug} />
            </label>
            <label>
              <span>지역</span>
              <input
                maxLength={160}
                name="region"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    region: event.target.value,
                  }))
                }
                placeholder="서울 성동구"
                required
                value={details.region}
              />
              <FieldError errors={state.fieldErrors?.region} />
            </label>
            <label>
              <span>형태</span>
              <select
                name="kind"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    kind: event.target.value as RestaurantFormValue["kind"],
                  }))
                }
                value={details.kind}
              >
                <option value="pizzeria">피제리아</option>
                <option value="restaurant">레스토랑</option>
                <option value="popup">기간 한정 팝업</option>
                <option value="franchise">프랜차이즈</option>
              </select>
              <FieldError errors={state.fieldErrors?.kind} />
            </label>
            <label className="admin-form-grid__wide">
              <span>설명</span>
              <textarea
                maxLength={3000}
                name="description"
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                value={details.description}
              />
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section__heading">
            <span>02 / PLACE</span>
            <h2>주소와 지도 위치</h2>
          </div>
          <KakaoPlacePicker
            appKey={appKey}
            onChange={handlePlaceChange}
            value={selectedPlace}
          />
          <div className="admin-form-grid admin-location-fields">
            <label className="admin-form-grid__wide">
              <span>정확한 주소</span>
              <input
                name="address"
                onChange={(event) =>
                  setLocation((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                value={location.address}
              />
              <FieldError errors={state.fieldErrors?.address} />
            </label>
            <label>
              <span>Kakao 장소 ID</span>
              <input
                name="kakaoPlaceId"
                onChange={(event) =>
                  setLocation((current) => ({
                    ...current,
                    kakaoPlaceId: event.target.value,
                  }))
                }
                value={location.kakaoPlaceId}
              />
            </label>
            <label>
              <span>기본 정보 출처 URL</span>
              <input
                name="sourceUrl"
                onChange={(event) =>
                  setSource((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://..."
                type="url"
                value={source.url}
              />
              <FieldError errors={state.fieldErrors?.sourceUrl} />
            </label>
            <label>
              <span>위도</span>
              <input
                inputMode="decimal"
                name="latitude"
                onChange={(event) =>
                  setLocation((current) => ({
                    ...current,
                    latitude: event.target.value,
                  }))
                }
                value={location.latitude}
              />
              <FieldError errors={state.fieldErrors?.latitude} />
            </label>
            <label>
              <span>경도</span>
              <input
                inputMode="decimal"
                name="longitude"
                onChange={(event) =>
                  setLocation((current) => ({
                    ...current,
                    longitude: event.target.value,
                  }))
                }
                value={location.longitude}
              />
              <FieldError errors={state.fieldErrors?.longitude} />
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section__heading admin-form-section__heading--action">
            <div>
              <span>03 / CERTIFICATION</span>
              <h2>인증</h2>
            </div>
            <button
              onClick={() =>
                setCertifications((current) => [
                  ...current,
                  {
                    certificationNumber: null,
                    clientKey: crypto.randomUUID(),
                    issuer: "",
                    name: "",
                    sourceUrl: "",
                    validFrom: null,
                    validUntil: null,
                  },
                ])
              }
              type="button"
            >
              + 인증 추가
            </button>
          </div>
          <FieldError errors={state.fieldErrors?.certifications} />
          <div className="admin-repeat-list">
            {certifications.map((certification, index) => (
              <div className="admin-repeat-row" key={certification.clientKey}>
                <label>
                  <span>인증명</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, name: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={certification.name}
                  />
                </label>
                <label>
                  <span>발급 기관</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, issuer: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={certification.issuer}
                  />
                </label>
                <label>
                  <span>인증 번호</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                certificationNumber: event.target.value,
                              }
                            : row,
                        ),
                      )
                    }
                    value={certification.certificationNumber ?? ""}
                  />
                </label>
                <label>
                  <span>출처 URL</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, sourceUrl: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="url"
                    value={certification.sourceUrl}
                  />
                </label>
                <label>
                  <span>유효 시작일</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, validFrom: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="date"
                    value={certification.validFrom ?? ""}
                  />
                </label>
                <label>
                  <span>유효 종료일</span>
                  <input
                    onChange={(event) =>
                      setCertifications((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, validUntil: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="date"
                    value={certification.validUntil ?? ""}
                  />
                </label>
                <button
                  className="admin-remove-row"
                  onClick={() =>
                    setCertifications((current) =>
                      current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  type="button"
                >
                  인증 제거
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section__heading admin-form-section__heading--action">
            <div>
              <span>04 / AWARD</span>
              <h2>대회 수상</h2>
            </div>
            <button
              onClick={() =>
                setAwards((current) => [
                  ...current,
                  {
                    awardYear: new Date().getFullYear(),
                    clientKey: crypto.randomUUID(),
                    competitionName: "",
                    division: "",
                    placement: "",
                    sourceUrl: "",
                  },
                ])
              }
              type="button"
            >
              + 수상 추가
            </button>
          </div>
          <FieldError errors={state.fieldErrors?.awards} />
          <div className="admin-repeat-list">
            {awards.map((award, index) => (
              <div className="admin-repeat-row" key={award.clientKey}>
                <label>
                  <span>대회명</span>
                  <input
                    onChange={(event) =>
                      setAwards((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, competitionName: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={award.competitionName}
                  />
                </label>
                <label>
                  <span>연도</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) =>
                      setAwards((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, awardYear: Number(event.target.value) }
                            : row,
                        ),
                      )
                    }
                    value={award.awardYear}
                  />
                </label>
                <label>
                  <span>부문</span>
                  <input
                    onChange={(event) =>
                      setAwards((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, division: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={award.division}
                  />
                </label>
                <label>
                  <span>수상</span>
                  <input
                    onChange={(event) =>
                      setAwards((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, placement: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={award.placement}
                  />
                </label>
                <label className="admin-repeat-row__wide">
                  <span>출처 URL</span>
                  <input
                    onChange={(event) =>
                      setAwards((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, sourceUrl: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="url"
                    value={award.sourceUrl}
                  />
                </label>
                <button
                  className="admin-remove-row"
                  onClick={() =>
                    setAwards((current) =>
                      current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  type="button"
                >
                  수상 제거
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section__heading admin-form-section__heading--action">
            <div>
              <span>05 / AVAILABILITY</span>
              <h2>운영 기간</h2>
            </div>
            <button
              onClick={() =>
                setAvailabilityPeriods((current) => [
                  ...current,
                  {
                    clientKey: crypto.randomUUID(),
                    endsOn: null,
                    note: null,
                    startsOn: "",
                  },
                ])
              }
              type="button"
            >
              + 운영 기간 추가
            </button>
          </div>
          <p className="admin-form-help">
            종료된 팝업도 보관하지 않고 공개 상태와 종료일을 유지하면 지도에서
            역사 기록으로 남길 수 있습니다.
          </p>
          <FieldError errors={state.fieldErrors?.availabilityPeriods} />
          <div className="admin-repeat-list">
            {availabilityPeriods.map((period, index) => (
              <div className="admin-repeat-row" key={period.clientKey}>
                <label>
                  <span>시작일</span>
                  <input
                    onChange={(event) =>
                      setAvailabilityPeriods((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, startsOn: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="date"
                    value={period.startsOn}
                  />
                </label>
                <label>
                  <span>종료일</span>
                  <input
                    onChange={(event) =>
                      setAvailabilityPeriods((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, endsOn: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="date"
                    value={period.endsOn ?? ""}
                  />
                </label>
                <label className="admin-repeat-row__wide">
                  <span>운영 메모</span>
                  <input
                    maxLength={500}
                    onChange={(event) =>
                      setAvailabilityPeriods((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, note: event.target.value }
                            : row,
                        ),
                      )
                    }
                    value={period.note ?? ""}
                  />
                </label>
                <button
                  className="admin-remove-row"
                  onClick={() =>
                    setAvailabilityPeriods((current) =>
                      current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  type="button"
                >
                  운영 기간 제거
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="admin-form-actions">
          <button
            disabled={isPending}
            name="intent"
            type="submit"
            value="draft"
          >
            {isPending ? "저장 중…" : "초안 저장"}
          </button>
          <button
            disabled={isPending}
            name="intent"
            type="submit"
            value="publish"
          >
            {isPending ? "공개 준비 중…" : "저장하고 공개"}
          </button>
        </div>
        <ActionMessage state={state} />
      </form>
    </div>
  );
}
