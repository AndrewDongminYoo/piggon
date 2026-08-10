export default function MyPizzaLoading() {
  return (
    <main className="collection-page" aria-busy="true" aria-live="polite">
      <div className="collection-loading paper-panel">
        <span aria-hidden="true">◔</span>
        <strong>피자 발자국을 꺼내는 중…</strong>
      </div>
    </main>
  );
}
