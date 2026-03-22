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
        action: "tools_schema_requested",
        resourceType: "api",
        resourceId: "/api/tools/schema",
      },
    });
  } else {
    logInfo("tools_schema_requested", { resourceId: "/api/tools/schema" });
  }

  const definitions = Object.fromEntries(
    AGENT_TOOLS.map((tool) => [
      tool.name,
      {
        description: tool.description,
        requiredScopes: tool.requiredScopes,
        input: tool.inputSchema,
        output: tool.outputSchema,
      },
    ])
  );

  return NextResponse.json({
    schemaVersion: "synthmr.tools.v1",
    auth: {
      authorizationHeader: "Authorization: Bearer YOUR_API_KEY",
    },
    definitions,
  });
}
