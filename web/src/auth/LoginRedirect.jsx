import { Navigate, useLocation } from "react-router-dom";

export default function LoginRedirect() {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);

  return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
}