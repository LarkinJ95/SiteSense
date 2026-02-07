import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Password reset</CardTitle>
          <CardDescription>
            Not implemented yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          For now, create a new account with a different email.
        </CardContent>
      </Card>
    </div>
  );
}

