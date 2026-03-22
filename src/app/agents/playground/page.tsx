import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PlaygroundClient } from "@/components/agents/playground-client";

export default async function AgentsPlaygroundPage() {
  if (process.env.ENABLE_API_PLAYGROUND !== "true") {
    notFound();
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/agents/playground");

  return <PlaygroundClient />;
}
