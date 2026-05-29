import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const execFileP = promisify(execFile);
const CACHE_DIR = join(tmpdir(), "raycast-speaking-coach-audio");

export function audioCacheKey(parts: { text: string; provider: string; voice: string; slow: boolean }): string {
  return createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

export function cachedAudioPath(key: string, ext: string): string | null {
  const p = join(CACHE_DIR, `${key}.${ext}`);
  return existsSync(p) ? p : null;
}

export async function writeAudioCache(key: string, ext: string, bytes: Buffer): Promise<string> {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
  const p = join(CACHE_DIR, `${key}.${ext}`);
  await writeFile(p, bytes);
  return p;
}

export async function playAudio(path: string, exec: typeof execFileP = execFileP): Promise<void> {
  await exec("afplay", [path]);
}
