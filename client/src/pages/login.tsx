import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, authClient } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/contexts/theme-context";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session } = authClient.useSession();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) setLocation("/");
  }, [session, setLocation]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.login(email, password);
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center">
            <BrandMark
              className="h-10 w-auto"
              title="AbateIQ"
              tone={
                theme === "dark" ||
                (theme === "system" &&
                  typeof window !== "undefined" &&
                  window.matchMedia &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches)
                  ? "onDark"
                  : "onLight"
              }
            />
          </div>
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>Use your AbateIQ account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading || !email || !password}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="text-sm text-center text-gray-600">
              <a className="text-primary underline" href="/register">
                Create an account
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
