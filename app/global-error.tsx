"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function GlobalError({ retry }: GlobalErrorProps) {
  return (
    <html lang="ko">
      <body
        style={{
          background: "#c8975d",
          color: "#1d1915",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        <title>Piggon 오류</title>
        <main
          role="alert"
          style={{
            alignItems: "center",
            background: "#fff8e7",
            border: "3px solid #1d1915",
            boxShadow: "6px 6px 0 #1d1915",
            display: "flex",
            flexDirection: "column",
            margin: "10vh auto",
            maxWidth: 680,
            padding: "clamp(32px, 7vw, 72px)",
            textAlign: "center",
            width: "calc(100% - 32px)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              alignItems: "center",
              background: "#e6462d",
              border: "3px solid #1d1915",
              borderRadius: "50%",
              color: "#fff8e7",
              display: "flex",
              fontSize: "2.5rem",
              fontWeight: 900,
              height: 70,
              justifyContent: "center",
              transform: "rotate(-8deg)",
              width: 70,
            }}
          >
            !
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.8rem)", marginBottom: 0 }}>
            피자 박스를 다시 접고 있어요
          </h1>
          <p style={{ lineHeight: 1.7, margin: "18px 0 28px" }}>
            화면을 불러오는 도중 문제가 생겼습니다. 오류 상세는 노출하지 않으니
            안심하고 다시 시도해 주세요.
          </p>
          <button
            onClick={() => retry()}
            style={{
              background: "#f2c94c",
              border: "3px solid #1d1915",
              boxShadow: "3px 3px 0 #1d1915",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 900,
              minHeight: 44,
              padding: "10px 16px",
            }}
            type="button"
          >
            다시 굽기
          </button>
        </main>
      </body>
    </html>
  );
}
