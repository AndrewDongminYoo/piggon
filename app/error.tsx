"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ retry }: ErrorPageProps) {
  return (
    <main className="route-not-found" role="alert">
      <span aria-hidden="true">!</span>
      <h1>오븐이 잠깐 식었습니다</h1>
      <p>
        오류 상세는 노출하지 않았어요. 잠시 후 다시 시도해 주세요. 사진 파일은
        보안상 다시 선택해야 할 수 있어요.
      </p>
      <button
        className="box-replay-button"
        onClick={() => retry()}
        type="button"
      >
        다시 굽기
      </button>
    </main>
  );
}
