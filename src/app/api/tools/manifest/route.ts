import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import { AGENT_TOOLS } from "@/lib/tools-manifest";

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req);
  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "tools_manifest_requested",
        resourceType: "api",
        resourceId: "/api/tools/manifest",
      },
    });
  } else {
    logInfo("tools_manifest_requested", { resourceId: "/api/tools/manifest" });
  }

  return NextResponse.json({
    version: "2026-03-09",
    auth: {
      type: "bearer",
      header: "Authorization: Bearer YOUR_API_KEY",
    },
    tools: AGENT_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema,
      requiredScopes: t.requiredScopes,
    })),
  });
}
