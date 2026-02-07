import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { accessLoginUrl } from "@/lib/auth";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();

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
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Password Reset</CardTitle>
          <CardDescription>
            Passwords are managed by your organization access provider (Cloudflare Access / IdP).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => (window.location.href = accessLoginUrl(window.location.origin + "/"))}>
            Continue to sign-in
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
