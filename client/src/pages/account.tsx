import { useEffect } from "react";

type AccountProps = { pathname?: string };

export function Account(_: AccountProps) {
  useEffect(() => {
    window.location.href = "/settings";
  }, []);
  return null;
}
