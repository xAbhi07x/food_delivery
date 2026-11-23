import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { AdminLoginForm } from "@/modules/auth/admin-login-form";
import { getCurrentUser } from "@/modules/auth/current-user";
import { roleHome } from "@/modules/auth/roles";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHome[user.role]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-medium">Administrator sign in</h1>
          <CardDescription>Authorised staff only.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
