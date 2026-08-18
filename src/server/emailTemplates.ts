/**
 * Verity Compliance - Production Transactional Email Templates
 * Real, professional transactional emails with zero mock data.
 */

export interface EmailTemplateData {
  contractorName: string;
  contractorTrade?: string;
  documentName: string;
  documentType: string;
  expirationDate?: string;
  daysRemaining?: number | null;
  requiredAction?: string;
  appUrl: string;
  recipientName?: string;
  workspaceName?: string;
}

export type EmailTemplateType =
  | 'DOCUMENT_EXPIRING_SOON'
  | 'DOCUMENT_EXPIRED'
  | 'COMPLIANCE_ACTION_REQUIRED'
  | 'GATE_READY'
  | 'MANUAL_RENEWAL_REQUEST';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function getBaseStyles(): string {
  return `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    margin: 0;
    padding: 0;
    line-height: 1.6;
  `;
}

export function renderEmail(type: EmailTemplateType, data: EmailTemplateData): RenderedEmail {
  const uploadLink = `${data.appUrl.replace(/\/$/, '')}/expirations`;
  const workspaceTitle = data.workspaceName || 'Verity Compliance';
  const contractorTitle = data.contractorName;

  switch (type) {
    case 'DOCUMENT_EXPIRING_SOON': {
      const daysText = data.daysRemaining === 0 
        ? 'TODAY' 
        : data.daysRemaining === 1 
        ? 'tomorrow' 
        : `in ${data.daysRemaining} days`;

      const subject = `[Action Required] ${data.documentName} for ${contractorTitle} expires ${daysText}`;
      
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="${getBaseStyles()} padding: 24px 12px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background: #0f172a; border-bottom: 2px solid #ef4444;">
        <table width="100%">
          <tr>
            <td>
              <span style="color: #ef4444; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">VERITY</span>
              <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">COMPLIANCE NOTIFICATION</span>
            </td>
            <td align="right">
              <span style="color: #f59e0b; background: #451a03; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
                Expiring ${daysText}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Upcoming Document Expiration Notice</h1>
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
          This is an automated compliance notice regarding <strong>${contractorTitle}</strong>. An active qualification document is scheduled to lapse.
        </p>

        <table width="100%" style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;">Contractor Entity:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${contractorTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Document / Policy:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.documentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Classification:</td>
            <td style="padding: 6px 0; color: #0f172a;">${data.documentType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Expiration Date:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #b45309;">${data.expirationDate || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Time Remaining:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #b45309;">${data.daysRemaining !== null ? `${data.daysRemaining} calendar day(s)` : 'Upcoming'}</td>
          </tr>
        </table>

        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; margin-bottom: 28px;">
          <p style="font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 4px 0;">Required Action</p>
          <p style="font-size: 12px; color: #b45309; margin: 0;">
            ${data.requiredAction || 'Please secure and upload an updated renewal certificate or certificate of insurance to maintain uninterrupted job site authorization.'}
          </p>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${uploadLink}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
                Review & Upload Renewal Document
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        Sent via ${workspaceTitle} automated compliance radar.<br>
        Direct access: <a href="${uploadLink}" style="color: #64748b;">${uploadLink}</a>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const text = `
VERITY COMPLIANCE NOTIFICATION - UPCOMING EXPIRATION

Contractor: ${contractorTitle}
Document: ${data.documentName}
Classification: ${data.documentType}
Expiration Date: ${data.expirationDate || 'N/A'}
Days Remaining: ${data.daysRemaining} days

REQUIRED ACTION:
${data.requiredAction || 'Please upload an updated renewal certificate to prevent job site gate restrictions.'}

Upload / Review Link:
${uploadLink}
      `.trim();

      return { subject, html, text };
    }

    case 'DOCUMENT_EXPIRED': {
      const subject = `[URGENT] Compliance Policy Expired: ${data.documentName} for ${contractorTitle}`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="${getBaseStyles()} padding: 24px 12px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background: #450a0a; border-bottom: 2px solid #dc2626;">
        <table width="100%">
          <tr>
            <td>
              <span style="color: #f87171; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">VERITY</span>
              <span style="color: #fca5a5; font-size: 12px; margin-left: 8px;">CRITICAL NOTICE</span>
            </td>
            <td align="right">
              <span style="color: #ffffff; background: #dc2626; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
                POLICY EXPIRED
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #991b1b; margin: 0 0 16px 0;">Contractor Qualification Lapsed</h1>
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
          A required compliance document for <strong>${contractorTitle}</strong> has reached its expiration date and is now expired. The compliance gate status has transitioned to <strong>NOT READY</strong>.
        </p>

        <table width="100%" style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #991b1b; width: 140px;">Contractor:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #7f1d1d;">${contractorTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #991b1b;">Expired Document:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #7f1d1d;">${data.documentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #991b1b;">Expired On:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #b91c1c;">${data.expirationDate || 'Lapsed'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #991b1b;">Compliance Gate:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #dc2626;">SITE ACCESS BLOCKED (NOT READY)</td>
          </tr>
        </table>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 4px; margin-bottom: 28px;">
          <p style="font-size: 13px; font-weight: 700; color: #991b1b; margin: 0 0 4px 0;">Immediate Remediation Required</p>
          <p style="font-size: 12px; color: #7f1d1d; margin: 0;">
            Site access will remain suspended until a valid replacement certificate is uploaded and verified by compliance administration.
          </p>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${uploadLink}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
                Upload Valid Certificate Now
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const text = `
VERITY CRITICAL COMPLIANCE NOTICE - DOCUMENT EXPIRED

Contractor: ${contractorTitle}
Expired Document: ${data.documentName}
Expiration Date: ${data.expirationDate || 'Lapsed'}
Gate Status: NOT READY / SITE ACCESS BLOCKED

IMMEDIATE ACTION REQUIRED:
Upload a valid replacement document immediately to restore compliance status:
${uploadLink}
      `.trim();

      return { subject, html, text };
    }

    case 'COMPLIANCE_ACTION_REQUIRED': {
      const subject = `[Action Required] Compliance Deficiency Notice for ${contractorTitle}`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="${getBaseStyles()} padding: 24px 12px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background: #0f172a; border-bottom: 2px solid #f59e0b;">
        <span style="color: #ef4444; font-size: 18px; font-weight: 800;">VERITY</span>
        <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">COMPLIANCE AUDIT</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Compliance Deficiency Identified</h1>
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
          An audit of the compliance records for <strong>${contractorTitle}</strong> determined that additional action is required to meet project specifications.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 8px 0;">Requirement Details:</p>
          <p style="font-size: 13px; color: #0f172a; margin: 0 0 4px 0;"><strong>Item:</strong> ${data.documentName}</p>
          <p style="font-size: 13px; color: #b45309; margin: 0;"><strong>Deficiency / Reason:</strong> ${data.requiredAction || 'Document missing, deficient coverage limit, or requires manual review.'}</p>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${uploadLink}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
                Review Compliance Passport
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const text = `
VERITY COMPLIANCE ACTION REQUIRED

Contractor: ${contractorTitle}
Item: ${data.documentName}
Deficiency: ${data.requiredAction || 'Action required to satisfy project compliance specifications.'}

Review & Remediate:
${uploadLink}
      `.trim();

      return { subject, html, text };
    }

    case 'GATE_READY': {
      const subject = `[Cleared] ${contractorTitle} is Compliant and Site-Approved`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="${getBaseStyles()} padding: 24px 12px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background: #064e3b; border-bottom: 2px solid #10b981;">
        <span style="color: #34d399; font-size: 18px; font-weight: 800;">VERITY</span>
        <span style="color: #a7f3d0; font-size: 12px; margin-left: 8px;">COMPLIANCE VERIFIED</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #065f46; margin: 0 0 16px 0;">Contractor Compliance Gate: READY</h1>
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
          All required compliance documentation for <strong>${contractorTitle}</strong> has been verified. The contractor is approved for active job site operations.
        </p>

        <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 13px; font-weight: 700; color: #065f46; margin: 0;">Status: APPROVED / READY</p>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${uploadLink}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
                View Contractor Passport
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const text = `
VERITY COMPLIANCE VERIFIED - CONTRACTOR READY

Contractor: ${contractorTitle}
Status: READY / SITE APPROVED

All mandatory requirements are satisfied and active.
View Passport: ${uploadLink}
      `.trim();

      return { subject, html, text };
    }

    case 'MANUAL_RENEWAL_REQUEST':
    default: {
      const subject = `[Document Request] Renewal Request: ${data.documentName} for ${contractorTitle}`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="${getBaseStyles()} padding: 24px 12px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background: #0f172a; border-bottom: 2px solid #ef4444;">
        <span style="color: #ef4444; font-size: 18px; font-weight: 800;">VERITY</span>
        <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">RENEWAL REQUEST</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">Subcontractor Renewal Request</h1>
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
          A renewal request has been dispatched for <strong>${contractorTitle}</strong> regarding <strong>${data.documentName}</strong>.
        </p>

        <table width="100%" style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;">Contractor:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${contractorTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Document Needed:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.documentName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Current Expiration:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${data.expirationDate || 'Expired / Pending'}</td>
          </tr>
        </table>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${uploadLink}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">
                Upload Updated Certificate
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const text = `
VERITY RENEWAL REQUEST

Contractor: ${contractorTitle}
Document Requested: ${data.documentName}
Current Expiration: ${data.expirationDate || 'Expired / Pending'}

Upload Link:
${uploadLink}
      `.trim();

      return { subject, html, text };
    }
  }
}
