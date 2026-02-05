import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { useLocation } from "wouter";

type AccountProps = {
  pathname?: string;
};

export function Account({ pathname }: AccountProps) {
  const [location] = useLocation();
  const resolvedPathname =
    pathname ?? (location.startsWith("/account/") ? location.slice("/account/".length) : undefined);
  return <AccountView pathname={resolvedPathname} />;
}
