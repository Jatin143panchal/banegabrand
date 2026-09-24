import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import nodemailer from "nodemailer";

function emailApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "banega-brand-email-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url === "/api/send-email" || req.url.startsWith("/api/send-email?") || req.url.startsWith("/api/send-email/"))) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

          if (req.method === "OPTIONS") {
            res.statusCode = 200;
            res.end("ok");
            return;
          }

          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });

            req.on("end", async () => {
              try {
                let parsedBody: any = {};
                try {
                  parsedBody = body ? JSON.parse(body) : {};
                } catch {
                  parsedBody = {};
                }

                const { to, subject, html, text, fromName, fromEmail } = parsedBody;

                if (!to || !subject || (!html && !text)) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Missing required fields: to, subject, and html or text." }));
                  return;
                }

                const smtpUser = env.SMTP_USER || process.env.SMTP_USER;
                const smtpPass = env.SMTP_PASS || process.env.SMTP_PASS;
                const smtpHost = env.SMTP_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
                const smtpPort = Number(env.SMTP_PORT || process.env.SMTP_PORT || 465);
                const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;

                const fromEmailAddr = fromEmail || env.SMTP_FROM_EMAIL || "info@banegabrand.com";
                const fromDisplayName = fromName || env.SMTP_FROM_NAME || "Banega Brand";
                const sender = `"${fromDisplayName}" <${fromEmailAddr}>`;

                // 1. Resend.com API (High Priority)
                if (resendApiKey) {
                  let activeSender = sender;
                  let resendRes = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${resendApiKey.trim()}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      from: activeSender,
                      to: Array.isArray(to) ? to : [to],
                      subject,
                      html: html || undefined,
                    }),
                  });

                  const rawResend = await resendRes.text();
                  let resendData: any = {};
                  try {
                    resendData = rawResend ? JSON.parse(rawResend) : {};
                  } catch {
                    resendData = { message: rawResend };
                  }

                  // If banegabrand.com is not verified yet in Resend, retry with onboarding@resend.dev
                  if (!resendRes.ok && (resendData.message?.includes("domain") || resendData.message?.includes("verify") || resendData.message?.includes("from"))) {
                    console.warn("[Email API] Resend domain not verified yet for team@banegabrand.com. Retrying with onboarding@resend.dev...");
                    activeSender = `"Banega Brand" <onboarding@resend.dev>`;
                    resendRes = await fetch("https://api.resend.com/emails", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${resendApiKey.trim()}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        from: activeSender,
                        to: Array.isArray(to) ? to : [to],
                        subject,
                        html: html || undefined,
                      }),
                    });
                    const retryRaw = await resendRes.text();
                    try {
                      resendData = retryRaw ? JSON.parse(retryRaw) : {};
                    } catch {
                      resendData = { message: retryRaw };
                    }
                  }

                  if (!resendRes.ok) {
                    throw new Error(resendData.message || "Failed to send email via Resend");
                  }

                  console.log(`[Email API] Real email sent to ${to} from ${activeSender} via Resend:`, resendData);
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      provider: "resend",
                      data: resendData,
                      recipient: to,
                      sender: activeSender,
                    })
                  );
                  return;
                }

              // 2. SMTP (Gmail, Hostinger, Zoho) fallback
              if (smtpUser && smtpPass) {
                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: {
                    user: smtpUser,
                    pass: smtpPass,
                  },
                });

                const info = await transporter.sendMail({
                  from: sender,
                  to,
                  subject,
                  html: html || undefined,
                  text: text || undefined,
                });

                console.log(`[Email API] Real email sent to ${to} from ${sender} via SMTP: ${info.messageId}`);
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    provider: "smtp",
                    messageId: info.messageId,
                    recipient: to,
                    sender,
                  })
                );
                return;
              }

              // If neither Resend nor SMTP is configured
              console.warn("[Email API] RESEND_API_KEY is not configured in .env");
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  error: "RESEND_API_KEY is missing in .env. Please add RESEND_API_KEY=re_... in .env to send emails via Resend.com.",
                })
              );
            } catch (err: any) {
              console.error("[Email API] Error sending email:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message || "Internal server error" }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      emailApiPlugin(env),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
