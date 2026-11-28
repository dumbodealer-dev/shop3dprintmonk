import "server-only";
import { db, must } from "../db";
import { randomToken, sha256 } from "./crypto";

type Subject = "customer" | "admin";
type Purpose = "verify_email" | "reset_password";

const TTL_MIN: Record<Purpose, number> = { verify_email: 60 * 48, reset_password: 60 };

/** Issues a one-time token (only its hash is stored). Older unused tokens for the same purpose are revoked. */
export async function issueToken(subjectType: Subject, subjectId: string, purpose: Purpose): Promise<string> {
  const token = randomToken();
  const now = new Date();
  await db()
    .from("shop_auth_tokens")
    .update({ used_at: now.toISOString() })
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("purpose", purpose)
    .is("used_at", null);
  must(
    await db().from("shop_auth_tokens").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      purpose,
      token_hash: sha256(token),
      expires_at: new Date(now.getTime() + TTL_MIN[purpose] * 60_000).toISOString(),
    }),
    "issue token",
  );
  return token;
}

/** Consumes a token atomically (conditional update = single use). Returns the subject id, or null. */
export async function consumeToken(subjectType: Subject, purpose: Purpose, token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const { data } = await db()
    .from("shop_auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", sha256(token))
    .eq("subject_type", subjectType)
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("subject_id")
    .maybeSingle();
  return data?.subject_id ?? null;
}
