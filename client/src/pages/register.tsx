import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { accessLoginUrl } from "@/lib/auth";

export default function Register() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (import.meta.env.PROD) {
      window.location.href = accessLoginUrl(window.location.origin + "/");
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
          <CardDescription>
            AbateIQ is internal-only. Ask your administrator to add you to the organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => (window.location.href = accessLoginUrl(window.location.origin + "/"))}>
            Continue to sign-in
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
