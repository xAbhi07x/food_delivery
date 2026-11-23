import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-medium">Murliganj Food Delivery</h1>
          <CardDescription>
            Foundation phase. No features are available yet.
          </CardDescription>
        </CardHeader>
      </Card>
      <Button render={<a href="/api/health" />} variant="outline">
        Check health endpoint
      </Button>
    </main>
  );
}
