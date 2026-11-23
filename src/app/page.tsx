import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-medium">Murliganj Food Delivery</h1>
          <CardDescription>
            Sign-in is available. Ordering is not available yet.
          </CardDescription>
        </CardHeader>
      </Card>
      <Button nativeButton={false} render={<a href="/login" />}>
        Customer sign in
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <a href="/rider/login" className="underline">
          Rider sign in
        </a>
        <a href="/admin/login" className="underline">
          Admin sign in
        </a>
      </div>
    </main>
  );
}
