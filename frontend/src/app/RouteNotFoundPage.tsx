export function RouteNotFoundPage() {
  return (
    <section
      className="panel"
      aria-labelledby="route-not-found-title"
    >
      <div className="ui-panel-body">
        <p className="eyebrow">Navigation</p>
        <h1 id="route-not-found-title">Page not found</h1>
        <p>The page you requested is unavailable.</p>
      </div>
    </section>
  );
}