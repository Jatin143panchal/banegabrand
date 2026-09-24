// services/emailService.ts
import { supabase } from "@/integrations/supabase/client";

export interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

export interface ProjectEmailData {
  to: string;
  clientName: string;
  brandName?: string | null;
  projectId: string;
  projectType?: string | null;
  productCategory?: string | null;
  productsToLaunch?: number | string | null;
  startDate?: string | null;
  expectedLaunchDate?: string | null;
  projectValue?: number | string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  notes?: string | null;
  projectManager?: string | null;
}
/**
 * Banega Brand Official Logo URL.
 * Uses public verified URL for optimal email client rendering, with local fallback in public/banega-brand-logo.png.
 */
export const BANEGA_BRAND_LOGO_URL = "https://www.banegabrand.com/assets/main_logo.webp";

/**
 * ============================================================
 * [OFFICIAL ONBOARDING EMAIL TEMPLATE - SCOPE OF WORK & DELIVERABLES]
 * Client: Dynamic ({clientName})
 * Contact: Pankaj Singh (Senior Growth Manager)
 * Email: pankaj@banegabrand.com | Mobile: +91 9717943312
 * Office: Banega Brand, C 171, Sector 63, Noida, India
 * ============================================================
 */
export function generateProjectWelcomeEmailHtml(data: ProjectEmailData): string {
  const clientName = data.clientName || "H K";
  const brandName = data.brandName || data.clientName || "Your Brand";
  const category = data.productCategory || data.projectType || "Brand Incubation";
  const productsCount = data.productsToLaunch || 1;
  const projectManager = data.projectManager || "Pankaj";
  const launchDate = data.expectedLaunchDate
    ? new Date(data.expectedLaunchDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "To be finalized";
  const startDate = data.startDate
    ? new Date(data.startDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Immediate";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scope of Work &amp; Deliverables - Banega Brand</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; max-width: 680px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #1e2229; border-bottom: 3px solid #f95716; padding: 32px 30px; text-align: center; }
    .brand-subtitle { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cbd5e1; margin: 0; }
    .content { padding: 34px 32px; }
    .greeting { font-size: 19px; font-weight: 700; color: #1e2229; margin: 0 0 14px 0; }
    .body-p { font-size: 14.5px; color: #334155; line-height: 1.68; margin: 0 0 14px 0; }
    
    /* Project Details Snapshot */
    .details-card { background: #fffaf5; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px 20px; margin: 22px 0 28px 0; }
    .details-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin: 0 0 12px 0; }
    .details-grid { width: 100%; border-collapse: collapse; }
    .details-grid td { padding: 6px 0; font-size: 13.5px; vertical-align: top; }
    .details-label { color: #64748b; width: 38%; font-weight: 500; }
    .details-val { color: #1e2229; font-weight: 600; width: 62%; }
    .badge { display: inline-block; background: #ffedd5; color: #c2410c; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }

    /* Deliverables Section */
    .section-header { margin: 30px 0 18px 0; border-bottom: 2px solid #fed7aa; padding-bottom: 10px; }
    .section-title { font-size: 17px; font-weight: 800; color: #1e2229; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
    .deliverable-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px; }
    .del-header { display: flex; align-items: center; margin-bottom: 10px; }
    .del-number { display: inline-block; min-width: 26px; height: 26px; line-height: 26px; background: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 12.5px; font-weight: 700; margin-right: 10px; vertical-align: middle; }
    .del-title { font-size: 15px; font-weight: 700; color: #1e2229; display: inline-block; vertical-align: middle; }
    .del-list { margin: 0; padding-left: 28px; color: #475569; font-size: 13.5px; line-height: 1.65; }
    .del-list li { margin-bottom: 5px; }

    /* Overall Deliverable Box */
    .overall-box { background: #fffaf5; border: 1px solid #fed7aa; border-radius: 8px; padding: 22px; margin: 30px 0; }
    .overall-title { font-size: 15px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0; }
    .pipeline-wrapper { background: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin: 12px 0; font-size: 13px; font-weight: 600; color: #1e2229; line-height: 1.8; text-align: center; }
    .pipeline-step { display: inline-block; background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 2px 8px; margin: 2px 2px; }
    .pipeline-arrow { color: #f97316; font-weight: bold; margin: 0 4px; }

    /* Additional Costs Box */
    .costs-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f95716; border-radius: 8px; padding: 20px 22px; margin: 28px 0; }
    .costs-title { font-size: 15px; font-weight: 800; color: #1e2229; margin: 0 0 8px 0; }
    .costs-list { margin: 10px 0 0 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6; }
    .costs-list li { margin-bottom: 5px; }

    /* Signature Card */
    .signature-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #f95716; border-radius: 8px; padding: 20px; margin: 28px 0 10px 0; }
    .sig-name { font-size: 16px; font-weight: 800; color: #1e2229; margin: 0 0 2px 0; }
    .sig-role { font-size: 13px; font-weight: 600; color: #ea580c; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .sig-contact { font-size: 13.5px; color: #334155; line-height: 1.7; }
    .sig-link { color: #ea580c; text-decoration: none; font-weight: 600; }

    /* Footer */
    .footer { background: #1e2229; color: #94a3b8; padding: 32px 30px; text-align: center; font-size: 12.5px; border-top: 3px solid #f95716; }
    .footer-logo-container { margin-bottom: 16px; }
    .footer-company { font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.03em; margin: 0 0 4px 0; }
    .footer-address { color: #cbd5e1; font-size: 13px; margin: 0 0 14px 0; }
    .footer-contact-row { padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); margin: 12px 0; font-size: 13px; color: #e2e8f0; }
    .footer-contact-row a { color: #fb923c; text-decoration: none; font-weight: 600; }
    .footer-copy { font-size: 11px; color: #64748b; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div style="margin-bottom: 12px; text-align: center;">
        <div style="display: inline-block; background: #ffffff; padding: 10px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 40px; width: auto; max-width: 190px; object-fit: contain; display: block;" />
        </div>
      </div>
      <p class="brand-subtitle">Brand Incubation | Manufacturing | D2C Launchpad</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2 class="greeting">Dear ${clientName},</h2>
      <p class="body-p"><strong>Greetings from Banega Brand!</strong></p>
      <p class="body-p">We’re excited to officially have you onboard.</p>
      <p class="body-p">
        As discussed, please find below the proposed <strong>Scope of Work &amp; Deliverables</strong> for building and launching your brand. Banega Brand will provide end-to-end support across brand strategy, product development, branding, production, digital presence, creative content, marketing, and launch.
      </p>

      <!-- Project Snapshot Card -->
      <div class="details-card">
        <div class="details-title">Project Snapshot</div>
        <div style="background: #ffedd5; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 14px; color: #9a3412; font-weight: 600;">
          Your Project Manager is <span style="font-weight: 700; color: #c2410c;">${projectManager}</span>
        </div>
        <table class="details-grid">
          <tr>
            <td class="details-label">Project ID:</td>
            <td class="details-val"><span class="badge">${data.projectId || "BB-NEW"}</span></td>
          </tr>
          <tr>
            <td class="details-label">Brand Name:</td>
            <td class="details-val">${brandName}</td>
          </tr>
          <tr>
            <td class="details-label">Client Name:</td>
            <td class="details-val">${clientName}</td>
          </tr>
          <tr>
            <td class="details-label">Project Manager:</td>
            <td class="details-val" style="color: #ea580c; font-weight: 700;">${projectManager}</td>
          </tr>
          <tr>
            <td class="details-label">Category:</td>
            <td class="details-val">${category}</td>
          </tr>
          <tr>
            <td class="details-label">Products to Launch:</td>
            <td class="details-val">${productsCount} product(s)</td>
          </tr>
          <tr>
            <td class="details-label">Start Date:</td>
            <td class="details-val">${startDate}</td>
          </tr>
          <tr>
            <td class="details-label">Expected Launch:</td>
            <td class="details-val">${launchDate}</td>
          </tr>
        </table>
      </div>

      <!-- Scope of Work & Deliverables Heading -->
      <div class="section-header">
        <h3 class="section-title">Scope of Work &amp; Deliverables</h3>
      </div>

      <!-- 1. Brand Strategy -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">1</span>
          <span class="del-title">Brand Strategy</span>
        </div>
        <ul class="del-list">
          <li>Understanding the brand vision, business objectives, target audience, and market opportunity.</li>
          <li>Defining the brand positioning, proposition, personality, and communication direction.</li>
          <li>Category and competitor analysis.</li>
          <li>Developing the overall brand strategy and go-to-market direction.</li>
        </ul>
      </div>

      <!-- 2. Product Development -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">2</span>
          <span class="del-title">Product Development</span>
        </div>
        <ul class="del-list">
          <li>Product category and product concept finalization.</li>
          <li>Product formulation/development in coordination with relevant experts/manufacturing partners.</li>
          <li>Ingredient/raw material and product specification guidance.</li>
          <li>Sample development and coordination.</li>
          <li>Product testing, feedback, and refinement until finalization, as applicable.</li>
        </ul>
      </div>

      <!-- 3. Brand Identity -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">3</span>
          <span class="del-title">Brand Identity</span>
        </div>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 30px; font-weight: 500;">
          Development of the complete brand identity, including:
        </p>
        <ul class="del-list">
          <li>Brand name finalization.</li>
          <li>Logo design and development.</li>
          <li>Brand colour palette and typography.</li>
          <li>Brand visual language and communication style.</li>
          <li>Brand guidelines/basic brand identity documentation.</li>
          <li>Assistance with GST, MSME/Udyam, trademark application/support, and other applicable business/brand documentation as mutually agreed.</li>
        </ul>
      </div>

      <!-- 4. Packaging -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">4</span>
          <span class="del-title">Packaging</span>
        </div>
        <ul class="del-list">
          <li>Packaging concept and format selection.</li>
          <li>Primary and secondary packaging development.</li>
          <li>Packaging design and artwork.</li>
          <li>Label/box design.</li>
          <li>Packaging material and specification coordination.</li>
          <li>Final packaging artwork for production.</li>
        </ul>
      </div>

      <!-- 5. Product Production -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">5</span>
          <span class="del-title">Product Production</span>
        </div>
        <ul class="del-list">
          <li>Identification and coordination with suitable manufacturing partners.</li>
          <li>Production planning and coordination.</li>
          <li>Sample approval and production coordination.</li>
          <li>Manufacturing and quality coordination.</li>
          <li>Assistance with packaging procurement/production coordination.</li>
          <li>Coordination until the finished products are ready for dispatch.</li>
        </ul>
      </div>

      <!-- 6. Website / E-commerce -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">6</span>
          <span class="del-title">Website / E-commerce</span>
        </div>
        <ul class="del-list">
          <li>Website structure and user journey planning.</li>
          <li>Website design and development.</li>
          <li>Product listing and product page development.</li>
          <li>E-commerce functionality, where applicable.</li>
          <li>Integration of relevant payment/shipping requirements.</li>
          <li>Basic website content and brand communication.</li>
          <li>Website launch support.</li>
        </ul>
      </div>

      <!-- 7. Photography & Creative -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">7</span>
          <span class="del-title">Photography &amp; Creative</span>
        </div>
        <ul class="del-list">
          <li>Product photography planning and coordination.</li>
          <li>Product images for website and e-commerce platforms.</li>
          <li>Creative assets for digital and social media communication.</li>
          <li>Product-focused visual content and campaign creatives.</li>
          <li>Coordination of photography/video production, wherever required.</li>
        </ul>
      </div>

      <!-- 8. Social Media -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">8</span>
          <span class="del-title">Social Media</span>
        </div>
        <ul class="del-list">
          <li>Social media strategy and content direction.</li>
          <li>Social media profile setup/optimization.</li>
          <li>Content planning and calendar.</li>
          <li>Creative posts, reels, stories, and product-focused content.</li>
          <li>Brand communication across relevant social media platforms.</li>
          <li>Community/content management as per the agreed plan.</li>
        </ul>
      </div>

      <!-- 9. Marketing -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">9</span>
          <span class="del-title">Marketing</span>
        </div>
        <ul class="del-list">
          <li>Development of the initial marketing strategy.</li>
          <li>Digital marketing and campaign planning.</li>
          <li>Performance marketing strategy, where applicable.</li>
          <li>Influencer/creator marketing coordination, where applicable.</li>
          <li>Campaign creatives and promotional communication.</li>
          <li>Marketing activities focused on building awareness, consideration, and sales.</li>
        </ul>
      </div>

      <!-- 10. Launch -->
      <div class="deliverable-card">
        <div style="margin-bottom: 8px;">
          <span class="del-number">10</span>
          <span class="del-title">Launch</span>
        </div>
        <ul class="del-list">
          <li>Pre-launch planning and brand/product readiness.</li>
          <li>Launch campaign strategy.</li>
          <li>Digital launch activities.</li>
          <li>Social media launch communication.</li>
          <li>Product launch creatives and promotional assets.</li>
          <li>Coordination of launch activities across relevant online channels.</li>
          <li>Post-launch marketing direction and initial optimization.</li>
        </ul>
      </div>

      <!-- Overall Deliverable -->
      <div class="overall-box">
        <div class="overall-title">Overall Deliverable</div>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b; font-weight: 600;">
          Banega Brand’s role will cover the complete end-to-end journey of the brand:
        </p>
        <div class="pipeline-wrapper">
          <span class="pipeline-step">Brand Strategy</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Product Development</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Brand Identity</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Packaging</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Product Production</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Website/E-commerce</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Photography &amp; Creative</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Social Media</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Marketing</span> <span class="pipeline-arrow">→</span>
          <span class="pipeline-step">Launch</span>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569; line-height: 1.6;">
          Detailed timelines, quantities, number of revisions, production specifications, third-party costs, registrations, advertising budgets, manufacturing costs, packaging costs, and other commercial requirements will be mutually finalized based on the selected products and project requirements.
        </p>
      </div>

      <!-- Additional Costs -->
      <div class="costs-box">
        <div class="costs-title">Additional Costs</div>
        <p style="margin: 0; font-size: 13.5px; color: #92400e; line-height: 1.5; font-weight: 500;">
          The following expenses, wherever applicable, will be charged separately and are not included in the core scope of work:
        </p>
        <ul class="costs-list">
          <li>Government and statutory fees</li>
          <li>Product testing and certification charges</li>
          <li>Manufacturing and production costs</li>
          <li>Raw materials and product development/sample costs</li>
          <li>Packaging materials, printing, and tooling/mould charges</li>
          <li>Logistics, transportation, and shipping charges</li>
          <li>Website domain, hosting, third-party software, and subscription charges</li>
          <li>Payment gateway and transaction charges</li>
          <li>Professional photography and videography production costs</li>
          <li>Influencer/creator collaboration fees</li>
          <li>Paid advertising, PR, and media buying budgets</li>
          <li>Marketplace/e-commerce platform fees and commissions</li>
          <li>Any third-party agency, vendor, or service-provider charges</li>
          <li>Any costs related to launch events, including venue, accommodation, food and beverages, décor, event setup, guest arrangements, transportation, and other event-related requirements, which will be borne separately by the client.</li>
        </ul>
      </div>

      <!-- Closing Partner Message -->
      <p style="font-size: 15px; color: #1e293b; font-weight: 600; line-height: 1.6; margin: 26px 0 20px 0;">
        We look forward to partnering with you to build, develop, and successfully launch your brand in the market.
      </p>

      <!-- Signature Card -->
      <div class="signature-card">
        <p style="margin: 0 0 4px 0; font-size: 13.5px; color: #64748b;">Warm regards,</p>
        <div class="sig-name">Team Banega Brand</div>
        <div class="sig-contact">
          <div>Website: <a href="https://www.banegabrand.com" target="_blank" class="sig-link">www.banegabrand.com</a></div>
          <div>Mobile: <a href="tel:+919717943312" class="sig-link">+91 9717943312</a></div>
          <div>Email: <a href="mailto:info@banegabrand.com" class="sig-link">info@banegabrand.com</a></div>
        </div>
      </div>
    </div>

    <!-- Footer with Logo and Contact Details -->
    <div class="footer">
      <!-- Footer Logo Slot -->
      <div class="footer-logo-container">
        <div style="display: inline-block; background: #ffffff; padding: 8px 20px; border-radius: 8px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          <img id="footer-logo" src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand Logo" style="height: 36px; width: auto; max-width: 170px; object-fit: contain; display: block;" />
        </div>
      </div>

      <div class="footer-company">Banega Brand</div>
      <div class="footer-address">C 171, Sector 63,, Noida, India</div>

      <div class="footer-contact-row">
        <span>Email: <a href="mailto:info@banegabrand.com">info@banegabrand.com</a></span>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <span>Mobile: <a href="tel:+919717943312">+91 9717943312</a></span>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <span>Website: <a href="https://www.banegabrand.com" target="_blank">www.banegabrand.com</a></span>
      </div>

      <div class="footer-copy">
        © ${new Date().getFullYear()} Banega Brand Pvt Ltd. All rights reserved.<br />
        This proposal and onboarding deliverable roadmap was prepared for ${clientName}.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Automatically triggers the welcome & process email to the client upon project creation.
export interface DispatchEmailResult {
  success: boolean;
  provider?: string;
  isSandbox?: boolean;
  previewUrl?: string;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Core email dispatcher:
 * 1. Primary: Supabase Edge Function 'send-email' (backed by Resend with verified banegabrand.com domain)
 * 2. Fallback: Local /api/send-email (Vite dev server)
 * Fully protects against "Failed to execute 'json' on 'Response'" errors with safe text-to-json parsing.
 */
export async function dispatchEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<DispatchEmailResult> {
  const { to, subject, html, text, fromName, fromEmail } = payload;
  const recipient = (to || "").trim();
  if (!recipient) {
    return { success: false, error: "Recipient email is missing" };
  }

  const senderName = fromName || "Banega Brand";
  const senderEmail = fromEmail || "info@banegabrand.com";

  // 1. Primary: Supabase Edge Function (Works in cloud, production, and localhost with Resend)
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipient,
        subject,
        html,
        text,
        fromName: senderName,
        fromEmail: senderEmail,
      },
    });

    if (!error && data && (data.success || data.ok)) {
      console.log(`[EmailService] Delivered via Supabase Edge Function to ${recipient}`, data);
      return { success: true, provider: "supabase-edge-resend", data };
    }

    if (error) {
      console.warn("[EmailService] Supabase edge function returned error:", error.message || error);
    }
  } catch (edgeErr: any) {
    console.warn("[EmailService] Supabase edge function invoke error, falling back to local API:", edgeErr?.message || edgeErr);
  }

  // 2. Fallback: Local Vite dev server API endpoint (/api/send-email) with safe parsing
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipient,
        subject,
        html,
        text,
        fromName: senderName,
        fromEmail: senderEmail,
      }),
    });

    const rawText = await res.text();
    let data: any = {};
    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: rawText.length > 200 ? `HTTP ${res.status} response from email API` : rawText };
      }
    }

    if (res.ok && (data.success || data.ok)) {
      console.log(`[EmailService] Delivered via local /api/send-email to ${recipient}`);
      return { success: true, provider: data.provider || "local-dev-api", data };
    }

    const errMsg = data.error || (res.status !== 200 ? `HTTP ${res.status}: Mail service returned error` : "Failed to deliver email via Resend");
    console.warn("[EmailService] API Error:", errMsg);
    return { success: false, error: errMsg };
  } catch (apiErr: any) {
    console.error("[EmailService] /api/send-email error:", apiErr);
    return { success: false, error: apiErr?.message || "Failed to connect to email API" };
  }
}

/**
 * Automated Client Onboarding & Launch Roadmap email trigger.
 */
export const sendProjectCreatedEmail = async (projectData: ProjectEmailData): Promise<DispatchEmailResult> => {
  if (!projectData.to || !projectData.to.trim()) {
    console.info("[EmailService] No client email provided, skipping automated email trigger.");
    return { success: false, error: "No recipient email" };
  }

  const brandName = projectData.brandName || projectData.clientName || "Your Brand";
  const subject = `Welcome to Banega Brand! Scope of Work & Deliverables for ${brandName} [${projectData.projectId || "BB-LAUNCH"}]`;
  const html = generateProjectWelcomeEmailHtml(projectData);

  return await dispatchEmail({
    to: projectData.to,
    subject,
    html,
    fromName: "Banega Brand",
    fromEmail: "info@banegabrand.com",
  });
};

/**
 * Task Assignment email trigger.
 */
export const sendTaskAssignmentEmail = async (emailData: {
  to: string;
  taskName: string;
  projectName: string;
  description: string;
  dueDate: string;
  assignedBy: string;
  taskLink: string;
}): Promise<DispatchEmailResult> => {
  return await dispatchEmail({
    to: emailData.to,
    subject: `New Task Assigned: ${emailData.taskName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e2229; padding: 20px; background: #f8fafc; margin: 0;">
        <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
          <div style="background: #1e2229; border-bottom: 3px solid #f95716; color: white; padding: 22px; text-align: center;">
            <div style="display: inline-block; background: #ffffff; padding: 6px 16px; border-radius: 6px; margin-bottom: 10px;">
              <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 30px; width: auto; display: block;" />
            </div>
            <h2 style="margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff;">New Task Assignment</h2>
          </div>
          <div style="padding: 26px 28px;">
            <p style="margin: 0 0 12px 0; font-size: 14.5px;"><strong>${emailData.assignedBy}</strong> has assigned you a task: <strong>${emailData.taskName}</strong></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Project:</strong> ${emailData.projectName}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;"><strong>Due Date:</strong> ${emailData.dueDate}</p>
            ${emailData.description ? `<p style="margin: 14px 0; font-size: 14px; color: #334155; background: #f8fafc; border-left: 3px solid #f95716; padding: 10px 14px; border-radius: 4px;"><strong>Description:</strong> ${emailData.description}</p>` : ""}
            <p style="margin-top: 24px;"><a href="${emailData.taskLink}" style="display:inline-block; padding:10px 22px; background:#f95716; color:white; text-decoration:none; border-radius:6px; font-weight:700; font-size: 13.5px;">View Task Details</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    fromName: "Banega Brand",
    fromEmail: "info@banegabrand.com",
  });
};

/**
 * Stage Completion email trigger.
 */
export const sendStageCompletedEmailService = async (data: {
  to: string;
  clientName: string;
  brandName?: string | null;
  projectId: string;
  stageName: string;
  remark?: string;
}): Promise<DispatchEmailResult> => {
  const brand = data.brandName || data.clientName || "Your Brand";
  const stage = data.stageName || "Milestone";
  const client = data.clientName || "Valued Client";
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return await dispatchEmail({
    to: data.to,
    subject: `${stage} Completed | Project "${brand}" [${data.projectId}]`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${stage} Completed - Banega Brand</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e2229; padding: 20px 10px; background-color: #f8fafc; margin: 0;">
        <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <div style="background: #1e2229; border-bottom: 3px solid #f95716; color: #ffffff; padding: 28px 24px; text-align: center;">
            <div style="display: inline-block; background: #ffffff; padding: 8px 22px; border-radius: 8px; margin-bottom: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.2);">
              <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 34px; width: auto; max-width: 170px; display: block;" />
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
              ${stage} Completed
            </h1>
            <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13.5px; font-weight: 500;">
              Milestone update for ${brand} (${data.projectId})
            </p>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 28px 20px 28px;">
            <p style="margin: 0 0 14px 0; font-size: 15px;">Dear <strong>${client}</strong>,</p>
            <p style="margin: 0 0 16px 0; font-size: 14.5px; color: #334155; line-height: 1.65;">
              We are pleased to inform you that the milestone <strong>"${stage}"</strong> for your brand launch project <strong>"${brand}"</strong> has been officially marked as <strong style="color: #16a34a;">COMPLETED</strong>.
            </p>

            <!-- Milestone Completion Snapshot Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 22px 0;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                Milestone Completion Summary
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 500;">Client Name:</td>
                  <td style="padding: 6px 0; color: #1e293b; font-weight: 700;">${client}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Project / Brand:</td>
                  <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${brand}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Project ID:</td>
                  <td style="padding: 6px 0; color: #0284c7; font-weight: 700; font-family: monospace;">${data.projectId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Stage Completed:</td>
                  <td style="padding: 6px 0; color: #16a34a; font-weight: 700;">${stage}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Status:</td>
                  <td style="padding: 6px 0;">
                    <span style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 9999px;">
                      Completed ✓
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Completion Date:</td>
                  <td style="padding: 6px 0; color: #334155; font-weight: 500;">${currentDate}</td>
                </tr>
              </table>
            </div>

            <!-- Notes & Remarks (if provided) -->
            ${data.remark ? `
            <div style="background: #fffaf5; border-left: 4px solid #f95716; padding: 14px 18px; margin: 18px 0; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #ea580c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Notes &amp; Remarks</p>
              <p style="margin: 6px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${data.remark}</p>
            </div>
            ` : ""}

            <p style="margin: 18px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
              Our team has transitioned into the next phase of your roadmap. We look forward to partnering with you on every step of your brand launch.
            </p>

            <!-- Signature Card -->
            <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 4px 0; font-size: 13.5px; color: #64748b;">Warm regards,</p>
              <div style="font-size: 15.5px; font-weight: 700; color: #1e2229;">Regards by Banega Brand</div>
              <div style="margin-top: 6px; font-size: 13px; color: #64748b; line-height: 1.6;">
                <div>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #ea580c; text-decoration: none; font-weight: 600;">www.banegabrand.com</a></div>
                <div>Email: <a href="mailto:info@banegabrand.com" style="color: #ea580c; text-decoration: none; font-weight: 600;">info@banegabrand.com</a></div>
              </div>
            </div>
          </div>

          <!-- Footer with Logo, Address and Links -->
          <div style="background: #1e2229; border-top: 1px solid #334155; padding: 24px 20px; text-align: center; color: #94a3b8; font-size: 12.5px; line-height: 1.7;">
            <div style="margin-bottom: 12px;">
              <div style="display: inline-block; background: #ffffff; padding: 6px 16px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 28px; width: auto; max-width: 140px; display: block;" />
              </div>
            </div>
            <div style="color: #f8fafc; font-weight: 700; font-size: 13.5px; margin-bottom: 4px;">Banega Brand</div>
            <div style="color: #cbd5e1; font-size: 12px; margin-bottom: 8px;">
              Block C-171, Sector 63, Noida, Uttar Pradesh, India
            </div>
            <div style="color: #94a3b8; font-size: 12px;">
              <span>Email: <a href="mailto:info@banegabrand.com" style="color: #f95716; text-decoration: none; font-weight: 500;">info@banegabrand.com</a></span>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #f95716; text-decoration: none; font-weight: 500;">www.banegabrand.com</a></span>
            </div>
            <div style="margin-top: 12px; font-size: 11px; color: #64748b;">
              © ${new Date().getFullYear()} Banega Brand Pvt Ltd. All rights reserved.
            </div>
          </div>

        </div>
      </body>
      </html>
    `,
    fromName: "Banega Brand",
    fromEmail: "info@banegabrand.com",
  });
};

/**
 * Alternative: Using SMTP directly
 */
export const sendEmailSMTP = async (config: EmailConfig) => {
  return await dispatchEmail(config);
};