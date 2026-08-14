const nodemailer = require("nodemailer");

/**
 * Mailer Utility for StructurAI
 * Uses EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASSWORD (or SMTP_*) environment variables.
 * Never hardcodes credentials or exposes them to frontend.
 */
function getTransporter() {
  const service = process.env.EMAIL_SERVICE || "gmail";
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Support direct SMTP host if specified, otherwise default to service configuration
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service,
    auth: { user, pass },
  });
}

/**
 * Send Redesigned Premium GitHub-Style Project Invitation Email
 */
async function sendProjectInvitationEmail({
  toEmail,
  inviterName,
  projectName,
  projectDescription,
  repositoryFullName,
  visibility = "private",
  inviteLink,
}) {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      "[MAILER] EMAIL_USER / EMAIL_PASSWORD environment variables not set in .env. Email dispatch skipped."
    );
    return {
      success: false,
      isConfigured: false,
      error: "EMAIL_USER / EMAIL_PASSWORD not configured in server environment.",
    };
  }

  const subject = `${inviterName} invited you to collaborate on ${projectName}`;
  const visibilityLabel = visibility === "public" ? "Public Project" : "Private Project";
  const repoNameDisplay = repositoryFullName || "structurAI/repository";

  // Plain Text Fallback for Email Clients
  const plainTextContent = `You've been invited to collaborate

${inviterName} has invited you to join the ${projectName} project on StructurAI.

Project: ${projectName}
Repository: ${repoNameDisplay}
Type: ${visibilityLabel}
${projectDescription ? `Description: ${projectDescription}\n` : ""}
Accept Invitation: ${inviteLink}

Once you join, you'll have access to the project's repository architecture, code health, AST call graphs, live WebRTC review rooms, and project activities.

Invited by: ${inviterName}
Project: ${projectName}
Expiration: Valid for 7 days

Or copy and paste this link into your browser:
${inviteLink}

--
StructurAI - Built for better software collaboration.
This invitation was sent to ${toEmail}.
`;

  // HTML Email Template (Light GitHub/Vercel/Linear Aesthetic)
  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Collaborator Invitation</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed;">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          
          <!-- Outer Card Container -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
            
            <!-- Header Section -->
            <tr>
              <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <!-- StructurAI Logo & Wordmark -->
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 32px; height: 32px; background-color: #0f172a; border-radius: 8px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 800; font-size: 16px;">
                            S
                          </td>
                          <td style="padding-left: 10px; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">
                            StructurAI
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content Area -->
            <tr>
              <td style="padding: 32px;">
                
                <!-- Badge Pill -->
                <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                  <tr>
                    <td style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 100px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
                      Project Invitation
                    </td>
                  </tr>
                </table>

                <!-- Large Headline -->
                <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.5px;">
                  You’ve been invited to collaborate
                </h1>

                <!-- Supporting Intro -->
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                  <strong>${inviterName}</strong> has invited you to join the <strong>${projectName}</strong> project on StructurAI.
                </p>

                <!-- Project Info Card -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 20px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                              ${projectName}
                            </div>
                            <div style="font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #64748b; margin-bottom: 10px;">
                              ${repoNameDisplay}
                            </div>
                            ${
                              projectDescription
                                ? `<div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 12px;">${projectDescription}</div>`
                                : ""
                            }
                            <div>
                              <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; color: #475569;">
                                ${visibilityLabel}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Primary CTA Button -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="background-color: #0f172a; border-radius: 10px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
                            <a href="${inviteLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                              Accept Invitation &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Supporting Detail -->
                <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
                  Once you join, you'll have access to the project's repository architecture, code health, AST call graphs, live WebRTC review rooms, and project activities.
                </p>

                <!-- Invitation Metadata Box -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-bottom: 20px;">
                  <tr>
                    <td style="font-size: 12px; color: #64748b; line-height: 1.8;">
                      <strong>Invited by:</strong> ${inviterName}<br />
                      <strong>Project:</strong> ${projectName}<br />
                      <strong>Expiration:</strong> Valid for 7 days
                    </td>
                  </tr>
                </table>

                <!-- Fallback Link Section -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; padding: 12px 16px;">
                  <tr>
                    <td style="font-size: 11px; color: #64748b; line-height: 1.5; word-break: break-all;">
                      Or copy and paste this link into your browser:<br />
                      <a href="${inviteLink}" style="color: #2563eb; text-decoration: underline;">${inviteLink}</a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer Section -->
            <tr>
              <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                  StructurAI
                </div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                  Built for better software collaboration.
                </div>
                <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
                  This invitation was sent to <span style="color: #64748b;">${toEmail}</span>.<br />
                  If you were not expecting this invitation, you can safely ignore it.
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

  try {
    const info = await transporter.sendMail({
      from: `"StructurAI Projects" <${user}>`,
      to: toEmail,
      subject,
      text: plainTextContent,
      html: htmlContent,
    });

    console.log(`[MAILER] Redesigned GitHub-style invitation email sent successfully to ${toEmail} (Message ID: ${info.messageId})`);
    return { success: true, isConfigured: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAILER] Failed to send invitation email to ${toEmail}:`, err.message);
    return { success: false, isConfigured: true, error: err.message };
  }
}

module.exports = {
  sendProjectInvitationEmail,
};
