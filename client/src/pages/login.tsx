import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { accessLoginUrl, authClient } from "@/lib/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session) {
      setLocation("/");
    }
  }, [session, setLocation]);

  useEffect(() => {
    if (import.meta.env.PROD) {
      window.location.href = accessLoginUrl(window.location.origin + "/");
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to AbateIQ</CardTitle>
          <CardDescription>
            Sign in via your organization access provider
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => (window.location.href = accessLoginUrl(window.location.origin + "/"))}>
              Continue to sign-in
            </Button>
            {import.meta.env.DEV && (
              <p className="text-xs text-gray-500">
                Dev note: set `DEV_AUTH_EMAIL` in `wrangler.toml` to bypass Access locally.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
