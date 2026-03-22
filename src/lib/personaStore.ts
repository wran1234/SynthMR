/**
 * Persona store: materialize sampled personas under DATA_BASE/personas/{personaId}/.
 * Files: persona.json, soul.md, soul.v{N}.md, memory.jsonl.
 * Note: worker writes these files; web reads them via persona/soul APIs, so both processes need DATA_DIR mounted in production.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { Persona } from "./types";

const DATA_BASE = process.env.DATA_DIR ?? path.join(os.homedir(), "synthmr-data");
const PERSONAS_DIR = path.join(DATA_BASE, "personas");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getPersonaDir(personaId: string): string {
  const safeId = personaId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(PERSONAS_DIR, safeId);
}

/** Ensure folder exists; write persona.json. */
export function ensurePersonaFolder(persona: Persona): string {
  const dir = getPersonaDir(persona.id);
  ensureDir(dir);
  const personaPath = path.join(dir, "persona.json");
  fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2), "utf-8");
  return dir;
}

export function readPersonaJson(personaId: string): Persona | null {
  const p = path.join(getPersonaDir(personaId), "persona.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Persona;
}

export function readSoulMd(personaId: string): string | null {
  const p = path.join(getPersonaDir(personaId), "soul.md");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

/** Write soul.md and optionally a versioned copy soul.v{N}.md. */
export function writeSoulMd(personaId: string, content: string, version?: number): void {
  const dir = getPersonaDir(personaId);
  ensureDir(dir);
  const mainPath = path.join(dir, "soul.md");
  fs.writeFileSync(mainPath, content, "utf-8");
  if (version != null && version > 0) {
    fs.writeFileSync(path.join(dir, `soul.v${version}.md`), content, "utf-8");
  }
}

export type MemoryEvent = {
  ts: string;
  type: string;
  studyRunId: string;
  observation: string;
  evidence: string;
  impact: string;
};

export function appendMemoryEvent(personaId: string, event: Omit<MemoryEvent, "ts">): void {
  const dir = getPersonaDir(personaId);
  ensureDir(dir);
  const memoryPath = path.join(dir, "memory.jsonl");
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...event,
  }) + "\n";
  fs.appendFileSync(memoryPath, line, "utf-8");
}

export function readMemoryEvents(personaId: string): MemoryEvent[] {
  const p = path.join(getPersonaDir(personaId), "memory.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as MemoryEvent);
}

/** List soul version numbers (e.g. [1, 2] for soul.v1.md, soul.v2.md). */
export function listSoulVersions(personaId: string): number[] {
  const dir = getPersonaDir(personaId);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const versions: number[] = [];
  for (const f of files) {
    const m = f.match(/^soul\.v(\d+)\.md$/);
    if (m) versions.push(parseInt(m[1], 10));
  }
  return versions.sort((a, b) => a - b);
}

/** Read soul at specific version (v0 = current soul.md). */
export function readSoulVersion(personaId: string, version: number): string | null {
  const dir = getPersonaDir(personaId);
  if (version <= 0) {
    const p = path.join(dir, "soul.md");
    return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
  }
  const p = path.join(dir, `soul.v${version}.md`);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}
