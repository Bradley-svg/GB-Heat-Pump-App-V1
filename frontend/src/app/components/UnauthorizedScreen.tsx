interface UnauthorizedScreenProps {
  title?: string;
  returnUrl: string;
}

export function UnauthorizedScreen({
  title = "Unauthorized",
  returnUrl,
}: UnauthorizedScreenProps) {
  return (
    <div className="wrap">
      <div className="card callout error" role="alert">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p>You do not have access to this dashboard. Try logging in again.</p>
        <a className="btn" href={`/app/logout?return=${encodeURIComponent(returnUrl)}`}>
          Return to login
        </a>
      </div>
    </div>
  );
}
