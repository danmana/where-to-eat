import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-24">
      <Card>
        <CardHeader>
          <CardTitle>Where to eat?</CardTitle>
          <CardDescription>in Cluj-Napoca</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
      </Card>
    </main>
  );
}
