export default function AppLoading() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
      <div className="page-skeleton-kicker" />
      <div className="page-skeleton-title" />
      <div className="page-skeleton-card" />
      <div className="page-skeleton-card short" />
    </div>
  );
}
