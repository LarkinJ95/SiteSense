import { AuthView } from "@neondatabase/neon-js/auth/react/ui";
import { useLocation } from "wouter";

type AuthProps = {
  pathname?: string;
};

export function Auth({ pathname }: AuthProps) {
  const [location] = useLocation();
  const resolvedPathname =
    pathname ?? (location.startsWith("/auth/") ? location.slice("/auth/".length) : undefined);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <AuthView pathname={resolvedPathname} />
    </div>
  );
}
