import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, User } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ExportDataButton, DeleteAccountButton, ApiKeysPanel, WebhooksPanel } from "@/components/account/account-actions";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account");

  return (
    <div className="container-narrow space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <Card className="card-elevated border-slate-200/80 dark:border-slate-700/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Account</CardTitle>
          <CardDescription>Your profile and settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-16 w-16 rounded-full border border-slate-200 dark:border-slate-600"
                width={64}
                height={64}
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                <User className="h-8 w-8" />
              </span>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {user.name ?? "No name"}
              </p>
              {user.email && (
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <ExportDataButton />
            <DeleteAccountButton />
          </div>

          <ApiKeysPanel />
          <WebhooksPanel />

          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
