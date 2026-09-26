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
  projectDescription?: string | null;
  projectManager?: string | null;
  projectManagerName?: string | null;
  projectManagerEmail?: string | null;
  projectManagerPhone?: string | null;
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
 * Contact: Dynamic Project Manager ({projectManagerName} / {projectManagerEmail} / {projectManagerPhone})
 * Office: Banega Brand, C 171, Sector 63, Noida, India
 * ============================================================
 */
export function generateProjectWelcomeEmailHtml(data: ProjectEmailData): string {
  const clientName = data.clientName || "Valued Client";
  const brandName = data.brandName || data.clientName || "Your Brand";
  const category = data.productCategory || data.projectType || "Brand Incubation";
  const productsCount = data.productsToLaunch || 1;
  const projectManagerName = data.projectManagerName || data.projectManager || "Pankaj Singh";
  const projectManagerEmail = data.projectManagerEmail || "pankaj@banegabrand.com";
  const projectManagerPhone = data.projectManagerPhone || "+91 9717943312";
  const projectDescription = (data.projectDescription || data.notes || "").trim();
  const startDate = data.startDate
    ? new Date(data.startDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scope of Work &amp; Deliverables - Banega Brand</title>
</head>
<body style="margin: 0; padding: 20px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; line-height: 1.6;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!-- Main Wrapper Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background-color: #1e2229; border-bottom: 3px solid #f95716; padding: 28px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #ffffff; padding: 8px 22px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.25);">
                <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 38px; width: auto; max-width: 180px; display: block;" />
              </div>
              <p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cbd5e1;">
                Brand Incubation | Manufacturing | D2C Launchpad
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 28px; text-align: left;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1e2229; margin: 0 0 12px 0;">Dear ${clientName},</h2>
              <p style="font-size: 14.5px; color: #1e293b; line-height: 1.6; margin: 0 0 8px 0;"><strong>Greetings from Banega Brand!</strong></p>
              <p style="font-size: 14.5px; color: #334155; line-height: 1.65; margin: 0 0 14px 0;">We’re excited to officially have you onboard.</p>
              <p style="font-size: 14.5px; color: #334155; line-height: 1.65; margin: 0 0 20px 0;">
                As discussed, please find below the proposed <strong>Scope of Work &amp; Deliverables</strong> for building and launching your brand. Banega Brand will provide end-to-end support across brand strategy, product development, branding, production, digital presence, creative content, marketing, and launch.
              </p>

              <!-- Project Snapshot Card -->
              <div style="background-color: #fffaf5; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 20px; margin: 22px 0 28px 0;">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin: 0 0 12px 0;">
                  Project Snapshot
                </div>
                
                <div style="background-color: #ffedd5; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; font-size: 13.5px; color: #9a3412;">
                  <div style="font-weight: 700; color: #c2410c; margin-bottom: 4px;">
                    Your Assigned Project Manager: ${projectManagerName}
                  </div>
                  <div style="font-size: 12.5px; color: #7c2d12;">
                    <span>Email: <strong><a href="mailto:${projectManagerEmail}" style="color: #c2410c; text-decoration: none;">${projectManagerEmail}</a></strong></span>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    <span>Mobile: <strong><a href="tel:${projectManagerPhone.replace(/\s+/g, '')}" style="color: #c2410c; text-decoration: none;">${projectManagerPhone}</a></strong></span>
                  </div>
                </div>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; width: 40%; font-weight: 500;">Project ID:</td>
                    <td style="padding: 7px 0; width: 60%;">
                      <span style="display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; font-family: monospace;">
                        ${data.projectId || "BB-NEW"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Brand Name:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 700;">${brandName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Client Name:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 600;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Category:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 600;">${category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Products to Launch:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 600;">${productsCount} product(s)</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Start Date:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 500;">${startDate}</td>
                  </tr>
                </table>

                <!-- Upload Your Document Highlight Action Box -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px; border-top: 1px dashed #fed7aa; padding-top: 16px;">
                  <tr>
                    <td align="center" style="text-align: center;">
                      <div style="font-size: 14px; font-weight: 700; color: #1e2229; margin-bottom: 6px;">
                        📁 Brand Onboarding &amp; Document Submission
                      </div>
                      <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                        Please click below to submit your trademark, brand identity, formulation &amp; required KYC documents:
                      </p>
                      <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                        <tr>
                          <td align="center" valign="middle" bgcolor="#f95716" style="background-color: #f95716; border-radius: 8px; padding: 13px 30px; box-shadow: 0 4px 14px rgba(249, 87, 22, 0.35);">
                            <a href="https://docs.google.com/forms/d/e/1FAIpQLScRVZubHMCH9hw5_lZx1_waaSZRpbqapIcJRLbVPVKOMKBDQw/viewform?pli=1" target="_blank" style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block;">
                              Upload Your Document &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="margin-top: 10px; font-size: 12px;">
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLScRVZubHMCH9hw5_lZx1_waaSZRpbqapIcJRLbVPVKOMKBDQw/viewform?pli=1" target="_blank" style="color: #ea580c; text-decoration: underline; font-weight: 600;">
                          (Click here to open Google Form)
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              ${projectDescription ? `
              <!-- Project Description Card -->
              <div style="background-color: #ffffff; border: 1.5px solid #fed7aa; border-left: 4px solid #f95716; border-radius: 8px; padding: 16px 20px; margin: 20px 0 26px 0;">
                <div style="font-size: 12px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                  Project Description
                </div>
                <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">
                  ${projectDescription}
                </p>
              </div>
              ` : ""}

              <!-- Scope of Work & Deliverables Heading -->
              <div style="margin: 32px 0 18px 0; border-bottom: 2px solid #fed7aa; padding-bottom: 10px;">
                <h3 style="font-size: 17px; font-weight: 800; color: #1e2229; text-transform: uppercase; letter-spacing: 0.04em; margin: 0;">Scope of Work &amp; Deliverables</h3>
              </div>

              <!-- 1. Brand Strategy -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">1</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Brand Strategy</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Understanding the brand vision, business objectives, target audience, and market opportunity.</li>
                  <li style="margin-bottom: 5px;">Defining the brand positioning, proposition, personality, and communication direction.</li>
                  <li style="margin-bottom: 5px;">Category and competitor analysis.</li>
                  <li style="margin-bottom: 5px;">Developing the overall brand strategy and go-to-market direction.</li>
                </ul>
              </div>

              <!-- 2. Product Development -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">2</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Product Development</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Product category and product concept finalization.</li>
                  <li style="margin-bottom: 5px;">Product formulation/development in coordination with relevant experts/manufacturing partners.</li>
                  <li style="margin-bottom: 5px;">Ingredient/raw material and product specification guidance.</li>
                  <li style="margin-bottom: 5px;">Sample development and coordination.</li>
                  <li style="margin-bottom: 5px;">Product testing, feedback, and refinement until finalization, as applicable.</li>
                </ul>
              </div>

              <!-- 3. Brand Identity -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">3</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Brand Identity</span>
                </div>
                <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 30px; font-weight: 500;">
                  Development of the complete brand identity, including:
                </p>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Brand name finalization.</li>
                  <li style="margin-bottom: 5px;">Logo design and development.</li>
                  <li style="margin-bottom: 5px;">Brand colour palette and typography.</li>
                  <li style="margin-bottom: 5px;">Brand visual language and communication style.</li>
                  <li style="margin-bottom: 5px;">Brand guidelines/basic brand identity documentation.</li>
                  <li style="margin-bottom: 5px;">Assistance with GST, MSME/Udyam, trademark application/support, and other applicable business/brand documentation as mutually agreed.</li>
                </ul>
              </div>

              <!-- 4. Packaging -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">4</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Packaging</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Packaging concept and format selection.</li>
                  <li style="margin-bottom: 5px;">Primary and secondary packaging development.</li>
                  <li style="margin-bottom: 5px;">Packaging design and artwork.</li>
                  <li style="margin-bottom: 5px;">Label/box design.</li>
                  <li style="margin-bottom: 5px;">Packaging material and specification coordination.</li>
                  <li style="margin-bottom: 5px;">Final packaging artwork for production.</li>
                </ul>
              </div>

              <!-- 5. Product Production -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">5</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Product Production</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Identification and coordination with suitable manufacturing partners.</li>
                  <li style="margin-bottom: 5px;">Production planning and coordination.</li>
                  <li style="margin-bottom: 5px;">Sample approval and production coordination.</li>
                  <li style="margin-bottom: 5px;">Manufacturing and quality coordination.</li>
                  <li style="margin-bottom: 5px;">Assistance with packaging procurement/production coordination.</li>
                  <li style="margin-bottom: 5px;">Coordination until the finished products are ready for dispatch.</li>
                </ul>
              </div>

              <!-- 6. Website / E-commerce -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">6</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Website / E-commerce</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Website structure and user journey planning.</li>
                  <li style="margin-bottom: 5px;">Website design and development.</li>
                  <li style="margin-bottom: 5px;">Product listing and product page development.</li>
                  <li style="margin-bottom: 5px;">E-commerce functionality, where applicable.</li>
                  <li style="margin-bottom: 5px;">Integration of relevant payment/shipping requirements.</li>
                  <li style="margin-bottom: 5px;">Basic website content and brand communication.</li>
                  <li style="margin-bottom: 5px;">Website launch support.</li>
                </ul>
              </div>

              <!-- 7. Photography & Creative -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">7</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Photography &amp; Creative</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Product photography planning and coordination.</li>
                  <li style="margin-bottom: 5px;">Product images for website and e-commerce platforms.</li>
                  <li style="margin-bottom: 5px;">Creative assets for digital and social media communication.</li>
                  <li style="margin-bottom: 5px;">Product-focused visual content and campaign creatives.</li>
                  <li style="margin-bottom: 5px;">Coordination of photography/video production, wherever required.</li>
                </ul>
              </div>

              <!-- 8. Social Media -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">8</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Social Media</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Social media strategy and content direction.</li>
                  <li style="margin-bottom: 5px;">Social media profile setup/optimization.</li>
                  <li style="margin-bottom: 5px;">Content planning and calendar.</li>
                  <li style="margin-bottom: 5px;">Creative posts, reels, stories, and product-focused content.</li>
                  <li style="margin-bottom: 5px;">Brand communication across relevant social media platforms.</li>
                  <li style="margin-bottom: 5px;">Community/content management as per the agreed plan.</li>
                </ul>
              </div>

              <!-- 9. Marketing -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">9</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Marketing</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Development of the initial marketing strategy.</li>
                  <li style="margin-bottom: 5px;">Digital marketing and campaign planning.</li>
                  <li style="margin-bottom: 5px;">Performance marketing strategy, where applicable.</li>
                  <li style="margin-bottom: 5px;">Influencer/creator marketing coordination, where applicable.</li>
                  <li style="margin-bottom: 5px;">Campaign creatives and promotional communication.</li>
                  <li style="margin-bottom: 5px;">Marketing activities focused on building awareness, consideration, and sales.</li>
                </ul>
              </div>

              <!-- 10. Launch -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; padding: 16px 18px;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; background-color: #f95716; color: #ffffff; border-radius: 6px; text-align: center; font-size: 13px; font-weight: 700; margin-right: 10px; vertical-align: middle;">10</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e2229; vertical-align: middle;">Launch</span>
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #475569; font-size: 13.5px; line-height: 1.65;">
                  <li style="margin-bottom: 5px;">Pre-launch planning and brand/product readiness.</li>
                  <li style="margin-bottom: 5px;">Launch campaign strategy.</li>
                  <li style="margin-bottom: 5px;">Digital launch activities.</li>
                  <li style="margin-bottom: 5px;">Social media launch communication.</li>
                  <li style="margin-bottom: 5px;">Product launch creatives and promotional assets.</li>
                  <li style="margin-bottom: 5px;">Coordination of launch activities across relevant online channels.</li>
                  <li style="margin-bottom: 5px;">Post-launch marketing direction and initial optimization.</li>
                </ul>
              </div>

              <!-- Overall Deliverable Box -->
              <div style="background-color: #fffaf5; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 22px; margin: 28px 0;">
                <div style="font-size: 15px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0;">
                  Overall Deliverable
                </div>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b; font-weight: 600;">
                  Banega Brand’s role will cover the complete end-to-end journey of the brand:
                </p>
                <div style="background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin: 12px 0; font-size: 13px; font-weight: 600; color: #1e2229; line-height: 1.9; text-align: center;">
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Brand Strategy</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Product Development</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Brand Identity</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Packaging</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Product Production</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Website/E-commerce</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Photography &amp; Creative</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Social Media</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Marketing</span> <span style="color: #f97316; font-weight: bold; margin: 0 4px;">&rarr;</span>
                  <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; border-radius: 4px; padding: 3px 8px; margin: 2px;">Launch</span>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569; line-height: 1.6;">
                  Detailed timelines, quantities, number of revisions, production specifications, third-party costs, registrations, advertising budgets, manufacturing costs, packaging costs, and other commercial requirements will be mutually finalized based on the selected products and project requirements.
                </p>
              </div>

              <!-- Additional Costs Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f95716; border-radius: 8px; padding: 20px 22px; margin: 26px 0;">
                <div style="font-size: 15px; font-weight: 800; color: #1e2229; margin: 0 0 8px 0;">Additional Costs</div>
                <p style="margin: 0; font-size: 13.5px; color: #92400e; line-height: 1.5; font-weight: 500;">
                  The following expenses, wherever applicable, will be charged separately and are not included in the core scope of work:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
                  <li style="margin-bottom: 5px;">Government and statutory fees</li>
                  <li style="margin-bottom: 5px;">Product testing and certification charges</li>
                  <li style="margin-bottom: 5px;">Manufacturing and production costs</li>
                  <li style="margin-bottom: 5px;">Raw materials and product development/sample costs</li>
                  <li style="margin-bottom: 5px;">Packaging materials, printing, and tooling/mould charges</li>
                  <li style="margin-bottom: 5px;">Logistics, transportation, and shipping charges</li>
                  <li style="margin-bottom: 5px;">Website domain, hosting, third-party software, and subscription charges</li>
                  <li style="margin-bottom: 5px;">Payment gateway and transaction charges</li>
                  <li style="margin-bottom: 5px;">Professional photography and videography production costs</li>
                  <li style="margin-bottom: 5px;">Influencer/creator collaboration fees</li>
                  <li style="margin-bottom: 5px;">Paid advertising, PR, and media buying budgets</li>
                  <li style="margin-bottom: 5px;">Marketplace/e-commerce platform fees and commissions</li>
                  <li style="margin-bottom: 5px;">Any third-party agency, vendor, or service-provider charges</li>
                  <li style="margin-bottom: 5px;">Any costs related to launch events, including venue, accommodation, food and beverages, décor, event setup, guest arrangements, transportation, and other event-related requirements, which will be borne separately by the client.</li>
                </ul>
              </div>

              <!-- Closing Message -->
              <p style="font-size: 15px; color: #1e293b; font-weight: 600; line-height: 1.6; margin: 26px 0 20px 0;">
                We look forward to partnering with you to build, develop, and successfully launch your brand in the market.
              </p>

              <!-- Signature Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #f95716; border-radius: 8px; padding: 20px; margin: 28px 0 10px 0;">
                <p style="margin: 0 0 4px 0; font-size: 13.5px; color: #64748b;">Warm regards,</p>
                <div style="font-size: 16px; font-weight: 800; color: #1e2229; margin: 0 0 2px 0;">${projectManagerName}</div>
                <div style="font-size: 13px; font-weight: 600; color: #ea580c; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Project Manager | Banega Brand</div>
                <div style="font-size: 13.5px; color: #334155; line-height: 1.7;">
                  <div>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #ea580c; text-decoration: none; font-weight: 600;">www.banegabrand.com</a></div>
                  <div>Mobile: <a href="tel:${projectManagerPhone.replace(/\s+/g, '')}" style="color: #ea580c; text-decoration: none; font-weight: 600;">${projectManagerPhone}</a></div>
                  <div>Email: <a href="mailto:${projectManagerEmail}" style="color: #ea580c; text-decoration: none; font-weight: 600;">${projectManagerEmail}</a></div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e2229; color: #94a3b8; padding: 30px 24px; text-align: center; font-size: 12.5px; border-top: 3px solid #f95716; line-height: 1.7;">
              <div style="margin-bottom: 14px;">
                <div style="display: inline-block; background-color: #ffffff; padding: 8px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 32px; width: auto; max-width: 160px; display: block;" />
                </div>
              </div>
              <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">Banega Brand</div>
              <div style="color: #cbd5e1; font-size: 12.5px; margin-bottom: 12px;">
                Block C-171, Sector 63, Noida, Uttar Pradesh, India
              </div>
              <div style="padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); margin: 10px 0; font-size: 12.5px; color: #e2e8f0;">
                <span>Email: <a href="mailto:info@banegabrand.com" style="color: #f95716; text-decoration: none; font-weight: 600;">info@banegabrand.com</a></span>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <span>Mobile: <a href="tel:+919717943312" style="color: #f95716; text-decoration: none; font-weight: 600;">+91 9717943312</a></span>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <span>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #f95716; text-decoration: none; font-weight: 600;">www.banegabrand.com</a></span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
                © ${new Date().getFullYear()} Banega Brand Pvt Ltd. All rights reserved.<br />
                This onboarding roadmap &amp; scope of work was prepared for ${clientName}.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Upload Documents:</td>
                  <td style="padding: 6px 0;">
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLScRVZubHMCH9hw5_lZx1_waaSZRpbqapIcJRLbVPVKOMKBDQw/viewform?pli=1" target="_blank" style="color: #ea580c; font-weight: 700; text-decoration: underline; font-size: 13.5px;">Upload Your Document &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Upload Documents Action Section in Milestone Summary -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 14px;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">
                      Need to submit assets or documents for this milestone?
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" valign="middle" bgcolor="#f95716" style="background-color: #f95716; border-radius: 6px; padding: 10px 26px;">
                          <a href="https://docs.google.com/forms/d/e/1FAIpQLScRVZubHMCH9hw5_lZx1_waaSZRpbqapIcJRLbVPVKOMKBDQw/viewform?pli=1" target="_blank" style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; display: inline-block;">
                            Upload Your Document &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
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
 * ============================================================
 * [TASK COMPLETED EMAIL SERVICE]
 * Triggered automatically when any project task is marked as "completed".
 * Sent exclusively in professional English from team@banegabrand.com.
 * ============================================================
 */
export interface TaskCompletedEmailData {
  to: string;
  clientName: string;
  brandName?: string | null;
  projectName?: string | null;
  projectId: string;
  taskName: string;
  department?: string | null;
  remark?: string | null;
  completedBy?: string | null;
}

export function generateTaskCompletedEmailHtml(data: TaskCompletedEmailData): string {
  const clientName = data.clientName || "Valued Client";
  const brandName = data.brandName || data.projectName || data.clientName || "Your Brand";
  const projectName = data.projectName || brandName;
  const projectId = data.projectId || "BB-PROJECT";
  const taskName = data.taskName || "Deliverable Task";
  const department = data.department || null;
  const completedBy = data.completedBy || "Banega Brand Team";
  const remark = data.remark?.trim() || "";
  const currentDate = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Completed - Banega Brand</title>
</head>
<body style="margin: 0; padding: 20px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; line-height: 1.6;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!-- Main Wrapper Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background-color: #1e2229; border-bottom: 3px solid #f95716; padding: 28px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #ffffff; padding: 8px 22px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.25);">
                <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 36px; width: auto; max-width: 180px; display: block;" />
              </div>
              <p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #cbd5e1;">
                Brand Incubation | Manufacturing | D2C Launchpad
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 28px; text-align: left;">
              <!-- Title & Status Badge -->
              <div style="margin-bottom: 18px;">
                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                  Task Completed ✓
                </span>
                <h2 style="font-size: 21px; font-weight: 700; color: #1e2229; margin: 0 0 6px 0;">
                  Task Completed for Your Project
                </h2>
                <p style="font-size: 14px; color: #64748b; margin: 0;">
                  Update for project: <strong style="color: #0f172a;">${brandName}</strong> (${projectId})
                </p>
              </div>

              <!-- Greeting -->
              <p style="font-size: 14.5px; color: #1e293b; line-height: 1.6; margin: 0 0 12px 0;">
                Dear <strong>${clientName}</strong>,
              </p>
              <p style="font-size: 14px; color: #334155; line-height: 1.65; margin: 0 0 20px 0;">
                We are pleased to inform you that our team has successfully finished the following task for your brand roadmap.
              </p>

              <!-- Task Details Card -->
              <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin: 0 0 14px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                  Task Summary
                </div>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; width: 38%; font-weight: 500;">Project Name:</td>
                    <td style="padding: 7px 0; width: 62%; color: #1e293b; font-weight: 700;">${projectName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Client Name:</td>
                    <td style="padding: 7px 0; color: #1e293b; font-weight: 600;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Project ID:</td>
                    <td style="padding: 7px 0;">
                      <span style="display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: monospace;">
                        ${projectId}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Task Completed:</td>
                    <td style="padding: 7px 0; color: #0f172a; font-weight: 700; font-size: 14.5px;">${taskName}</td>
                  </tr>
                  ${department ? `
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Department:</td>
                    <td style="padding: 7px 0; color: #334155; font-weight: 600;">${department}</td>
                  </tr>` : ""}
                  ${completedBy ? `
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Completed By:</td>
                    <td style="padding: 7px 0; color: #334155; font-weight: 600;">${completedBy}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Status:</td>
                    <td style="padding: 7px 0;">
                      <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
                        Completed ✓
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Completion Date:</td>
                    <td style="padding: 7px 0; color: #334155; font-weight: 500;">${currentDate}</td>
                  </tr>
                </table>
              </div>

              <!-- Remarks / Notes Section -->
              <div style="background-color: #fffaf5; border: 1.5px solid #fed7aa; border-left: 4px solid #f95716; border-radius: 8px; padding: 16px 18px; margin: 22px 0;">
                <div style="font-size: 12px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
                  Task Remark / Notes
                </div>
                <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">
                  ${remark || "The task has been reviewed, executed, and completed as per project specifications."}
                </p>
              </div>

              <!-- Upload Documents Action Section -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; margin: 24px 0;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <div style="font-size: 13.5px; font-weight: 700; color: #1e2229; margin-bottom: 6px;">
                      📁 Need to share any feedback or documents?
                    </div>
                    <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      You can securely upload files, assets, or feedback using our document portal:
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" valign="middle" bgcolor="#f95716" style="background-color: #f95716; border-radius: 6px; padding: 10px 24px;">
                          <a href="https://docs.google.com/forms/d/e/1FAIpQLScRVZubHMCH9hw5_lZx1_waaSZRpbqapIcJRLbVPVKOMKBDQw/viewform?pli=1" target="_blank" style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; font-weight: bold; text-decoration: none; display: inline-block;">
                            Upload Your Document &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Closing Note -->
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 20px 0 0 0;">
                Our team is actively executing the upcoming milestones on your roadmap. If you have any questions regarding this deliverable, please feel free to reach out to us at <a href="mailto:team@banegabrand.com" style="color: #ea580c; text-decoration: none; font-weight: 600;">team@banegabrand.com</a>.
              </p>

              <!-- Signature Card -->
              <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Warm regards,</p>
                <div style="font-size: 15.5px; font-weight: 800; color: #1e2229;">Banega Brand Team</div>
                <div style="font-size: 12.5px; font-weight: 600; color: #ea580c; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;">
                  Brand Incubation &amp; Launchpad
                </div>
                <div style="margin-top: 10px; font-size: 13px; color: #64748b; line-height: 1.6;">
                  <div>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #ea580c; text-decoration: none; font-weight: 600;">www.banegabrand.com</a></div>
                  <div>Email: <a href="mailto:team@banegabrand.com" style="color: #ea580c; text-decoration: none; font-weight: 600;">team@banegabrand.com</a></div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1e2229; color: #94a3b8; padding: 26px 22px; text-align: center; font-size: 12px; border-top: 3px solid #f95716; line-height: 1.7;">
              <div style="margin-bottom: 12px;">
                <div style="display: inline-block; background-color: #ffffff; padding: 6px 18px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <img src="${BANEGA_BRAND_LOGO_URL}" alt="Banega Brand" style="height: 28px; width: auto; max-width: 140px; display: block;" />
                </div>
              </div>
              <div style="color: #ffffff; font-weight: 700; font-size: 13.5px; margin-bottom: 2px;">Banega Brand Pvt Ltd</div>
              <div style="color: #cbd5e1; font-size: 12px; margin-bottom: 8px;">
                Block C-171, Sector 63, Noida, Uttar Pradesh, India
              </div>
              <div style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); margin: 8px 0; font-size: 12px; color: #e2e8f0;">
                <span>Email: <a href="mailto:team@banegabrand.com" style="color: #f95716; text-decoration: none; font-weight: 600;">team@banegabrand.com</a></span>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <span>Website: <a href="https://www.banegabrand.com" target="_blank" style="color: #f95716; text-decoration: none; font-weight: 600;">www.banegabrand.com</a></span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
                © ${new Date().getFullYear()} Banega Brand Pvt Ltd. All rights reserved.<br />
                This notification was automatically sent to ${clientName} for project reference.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Direct task completion email sender.
 * Always triggers from team@banegabrand.com.
 */
export const sendTaskCompletedEmailService = async (
  data: TaskCompletedEmailData
): Promise<DispatchEmailResult> => {
  const brand = data.brandName || data.projectName || data.clientName || "Your Brand";
  const task = data.taskName || "Task";
  const html = generateTaskCompletedEmailHtml(data);

  return await dispatchEmail({
    to: data.to,
    subject: `Task Completed: ${task} | Project "${brand}" [${data.projectId}]`,
    html,
    fromName: "Banega Brand Team",
    fromEmail: "team@banegabrand.com",
  });
};

/**
 * Higher-level helper to trigger a task completion email by taskId.
 * Automatically looks up project details, client email, and latest task remarks.
 */
export async function notifyTaskCompleted(params: {
  taskId: string;
  explicitRemark?: string | null;
  completedByName?: string | null;
}): Promise<DispatchEmailResult | null> {
  try {
    const { data: task, error: taskError } = await supabase
      .from("project_tasks")
      .select("id, project_id, task_name, description, department, employee_remarks, assigned_to_name, assigned_to_email")
      .eq("id", params.taskId)
      .single();

    if (taskError || !task) {
      console.warn("[notifyTaskCompleted] Could not find task:", params.taskId, taskError);
      return null;
    }

    if (!task.project_id) {
      console.warn("[notifyTaskCompleted] Task has no project_id:", params.taskId);
      return null;
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, project_id, name, brand_name, client_email")
      .eq("id", task.project_id)
      .single();

    if (projectError || !project) {
      console.warn("[notifyTaskCompleted] Could not find project:", task.project_id, projectError);
      return null;
    }

    const clientEmail = (project.client_email || "").trim();
    if (!clientEmail) {
      console.info(`[notifyTaskCompleted] Project "${project.name}" has no client email. Skipping email.`);
      return null;
    }

    // Determine remark: explicit remark > latest task_remarks > employee_remarks
    let remark = (params.explicitRemark || "").trim();
    if (!remark) {
      try {
        const { data: latestRemark } = await supabase
          .from("task_remarks")
          .select("remark")
          .eq("task_id", params.taskId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestRemark?.remark) {
          remark = latestRemark.remark.trim();
        }
      } catch (e) {
        console.warn("[notifyTaskCompleted] Error fetching latest task_remarks:", e);
      }
    }

    if (!remark && task.employee_remarks) {
      remark = task.employee_remarks.trim();
    }

    const result = await sendTaskCompletedEmailService({
      to: clientEmail,
      clientName: project.name || "Valued Client",
      brandName: project.brand_name || project.name || "Your Brand",
      projectName: project.name || "Brand Launch",
      projectId: project.project_id || "BB-PROJECT",
      taskName: task.task_name,
      department: task.department,
      remark: remark || null,
      completedBy: params.completedByName || task.assigned_to_name || "Banega Brand Team",
    });

    return result;
  } catch (err: any) {
    console.error("[notifyTaskCompleted] Error sending task completion email:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Alternative: Using SMTP directly
 */
export const sendEmailSMTP = async (config: EmailConfig) => {
  return await dispatchEmail(config);
};