import { Link, useLocation } from "react-router-dom";

export default function Unauthorized() {
  const location = useLocation();
  const from = (location.state as any)?.from as string | undefined;
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don’t have permission to view this page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="text-primary underline">Go Home</Link>
          <span className="text-muted-foreground">or</span>
          <Link to="/admin/login" className="text-primary underline">Admin Login</Link>
        </div>
        {from && (
          <p className="text-xs text-muted-foreground">Requested: {from}</p>
        )}
      </div>
    </div>
  );
}

