import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brand } from "@/components/game/brand";
import { CreateForm } from "@/components/game/create-form";
import { JoinForm } from "@/components/game/join-form";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-violet-50 via-white to-white px-4 py-8 dark:from-zinc-950 dark:via-black dark:to-black">
      <div className="w-full max-w-md">
        <Brand subtitle="Kahoot-style yoga, judged by AI vision." />
        <Card>
          <CardContent>
            <Tabs defaultValue="create">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="join">Join</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="pt-5">
                <CreateForm />
              </TabsContent>
              <TabsContent value="join" className="pt-5">
                <JoinForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mx-auto mt-4 max-w-xs text-center text-xs text-muted-foreground">
          Host on a big screen, players join from their phones. Recording needs
          camera access over HTTPS.
        </p>
      </div>
    </main>
  );
}
