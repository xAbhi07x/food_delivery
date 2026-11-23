import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/current-user";
import { OtpLoginForm } from "@/modules/auth/otp-login-form";
import { roleHome } from "@/modules/auth/roles";

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHome[user.role]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-medium">Sign in</h1>
          <CardDescription>
            Enter your mobile number. We will text you a code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OtpLoginForm portal="customer" />
        </CardContent>
      </Card>
    </main>
  );
}
