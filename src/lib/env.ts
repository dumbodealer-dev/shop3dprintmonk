import "server-only";

/**
 * Server-side configuration. Secrets are read from environment variables only
 * and are never imported into client components (enforced by "server-only").
 */
function num(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  quoteBucket: process.env.SUPABASE_QUOTE_BUCKET || "quote-uploads",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  businessNotificationEmail: process.env.BUSINESS_NOTIFICATION_EMAIL ?? "",
  /** One or more team inboxes: comma, semicolon or space separated. */
  businessNotificationEmails: (process.env.BUSINESS_NOTIFICATION_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
  ipHashSalt: process.env.IP_HASH_SALT ?? "",
  revalidateSecret: process.env.REVALIDATE_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  // 3D files are often heavy: default 5 GB per file (Supabase standard-upload ceiling).
  uploadMaxFileMb: num(process.env.UPLOAD_MAX_FILE_MB, 5120),
  uploadMaxFiles: num(process.env.UPLOAD_MAX_FILES, 25),
  /** Validity of the private download links emailed to the team. */
  downloadLinkDays: num(process.env.DOWNLOAD_LINK_DAYS, 7),
};

export const integrations = {
  database: Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey),
  email: Boolean(serverEnv.resendApiKey && serverEnv.emailFrom && serverEnv.businessNotificationEmails.length),
};

export function uploadLimits() {
  return {
    maxFileBytes: serverEnv.uploadMaxFileMb * 1024 * 1024,
    maxFileMb: serverEnv.uploadMaxFileMb,
    maxFiles: serverEnv.uploadMaxFiles,
  };
}
