import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, asNextResponse } from "@/lib/require-auth";
import { requireEmailVerified } from "@/lib/require-email-verified";
import { logError } from "@/lib/logger";
import { USER_MESSAGES } from "@/lib/errors";

const TargetAudienceSchema = z.object({
  label: z.string().max(200),
  ageRange: z.tuple([z.number(), z.number()]).optional(),
  incomeRange: z.tuple([z.number(), z.number()]).optional(),
  education: z.array(z.string()).optional(),
  employment: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(200),
  targetAudienceJson: TargetAudienceSchema,
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const presets = await prisma.audiencePreset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(presets);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("List presets failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    requireEmailVerified(user);

    const body = await req.json();
    const parsed = CreatePresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: USER_MESSAGES.invalidInput, details: parsed.error.flatten() }, { status: 400 });
    }
    const preset = await prisma.audiencePreset.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        targetAudienceJson: parsed.data.targetAudienceJson,
      },
    });
    return NextResponse.json(preset);
  } catch (err) {
    const res = asNextResponse(err);
    if (res) return res;
    logError("Create preset failed");
    return NextResponse.json({ error: USER_MESSAGES.generic }, { status: 500 });
  }
}
