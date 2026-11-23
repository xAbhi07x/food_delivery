import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/modules/auth/current-user";
import { SignOutButton } from "@/modules/auth/sign-out-button";

export default async function RiderHomePage() {
  const user = await requireRole("RIDER");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-medium">Rider area</h1>
          <CardDescription>
            Signed in as {user.fullName ?? user.phone}. Order features are not
            available yet.
          </CardDescription>
        </CardHeader>
      </Card>
      <SignOutButton />
    </main>
  );
}
