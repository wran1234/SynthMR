import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const userId = user.id;

    const [studies, presets] = await Promise.all([
      prisma.study.findMany({
        where: { userId },
        include: {
          runs: {
            orderBy: { createdAt: "desc" },
            include: {
              aggregates: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.audiencePreset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      userId,
      studies,
      presets,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="synthmr-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Account export failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
