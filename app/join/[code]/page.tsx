import { Card, CardContent } from "@/components/ui/card";
import { Brand } from "@/components/game/brand";
import { JoinForm } from "@/components/game/join-form";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-violet-50 via-white to-white px-4 py-8 dark:from-zinc-950 dark:via-black dark:to-black">
      <div className="w-full max-w-md">
        <Brand subtitle="Joining the game" />
        <Card>
          <CardContent>
            <JoinForm code={code.toUpperCase()} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
