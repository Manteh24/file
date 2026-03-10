// PM2 process configuration for the Next.js standalone output.
// Deploy with: pm2 start ecosystem.config.js --env production
// First run:   pm2 start ecosystem.config.js --env production && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "amlakiar",

      // Next.js standalone server entry point (built by `next build`)
      script: ".next/standalone/server.js",

      // Fork mode — do NOT use cluster mode with Next.js standalone.
      // The in-memory rate limiter (lib/rate-limit.ts) and settings cache
      // (lib/platform-settings.ts) are process-local; clustering would give
      // each worker its own independent state.
      exec_mode: "fork",
      instances: 1,

      // Restart the process if it consumes more than 512 MB
      max_memory_restart: "512M",

      // Keep stdout/stderr logs in the project directory
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      env_production: {
        NODE_ENV: "production",
        PORT: "3000",

        // ── Required env vars ─────────────────────────────────────────────────
        // Copy these from .env.example and fill in real values on the VPS.
        // Do NOT commit actual secrets here.

        DATABASE_URL: "",

        NEXTAUTH_SECRET: "",
        NEXTAUTH_URL: "",

        AVALAI_API_KEY: "",

        NESHAN_API_KEY: "",
        NEXT_PUBLIC_NESHAN_MAP_KEY: "",

        KAVENEGAR_API_KEY: "",

        ZARINPAL_MERCHANT_ID: "",

        STORAGE_ENDPOINT: "",
        STORAGE_ACCESS_KEY: "",
        STORAGE_SECRET_KEY: "",
        STORAGE_BUCKET_NAME: "",

        NEXT_PUBLIC_SHARE_DOMAIN: "",

        // Required for nightly trial-locking cron job.
        // Generate with: openssl rand -hex 32
        CRON_SECRET: "",
      },
    },
  ],
}
