import { useEffect } from "react";
import { accessLoginUrl } from "@/lib/auth";

type AccountProps = { pathname?: string };

export function Account(_: AccountProps) {
  useEffect(() => {
    if (import.meta.env.PROD) {
      window.location.href = accessLoginUrl(window.location.origin + "/");
    }
  }, []);
  return null;
}
