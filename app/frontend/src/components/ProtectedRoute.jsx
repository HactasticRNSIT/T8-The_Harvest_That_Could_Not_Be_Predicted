"import { Navigate } from \"react-router-dom\";
import { useAuth } from \"@/contexts/AuthContext\";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center text-white/60\" data-testid=\"loading-screen\">
        <div className=\"flex items-center gap-3\">
          <span className=\"w-3 h-3 rounded-full bg-neon-green animate-pulse-glow\" />
          Loading AgriSense…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to=\"/login\" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to=\"/dashboard\" replace />;
  return children;
}
"