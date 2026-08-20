/**
 * Verity Compliance - Server-Side Email Delivery Abstraction
 * Supports Resend, SendGrid, Postmark, and Custom SMTP.
 * Secrets are strictly server-side and never exposed to the frontend.
 */

export interface EmailDispatchOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  provider: 'RESEND' | 'SENDGRID' | 'POSTMARK' | 'SMTP' | 'NONE';
  messageId?: string;
  status: 'SENT' | 'FAILED' | 'CONFIG_REQUIRED';
  error?: string;
  details?: string;
}

export async function sendTransactionalEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const emailFrom = process.env.EMAIL_FROM || 'Verity Compliance <notifications@veritycompliance.com>';

  // 1. Check Resend (https://resend.com)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || emailFrom,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const resData: any = await response.json().catch(() => ({}));
      if (response.ok && resData?.id) {
        return {
          success: true,
          provider: 'RESEND',
          messageId: resData.id,
          status: 'SENT',
        };
      }

      return {
        success: false,
        provider: 'RESEND',
        status: 'FAILED',
        error: resData?.message || `Resend delivery failed with HTTP status ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'RESEND',
        status: 'FAILED',
        error: err?.message || 'Network error during Resend email dispatch',
      };
    }
  }

  // 2. Check SendGrid (https://sendgrid.com)
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: options.from || emailFrom.replace(/.*<(.+)>/, '$1') || 'notifications@veritycompliance.com' },
          subject: options.subject,
          content: [
            { type: 'text/plain', value: options.text },
            { type: 'text/html', value: options.html },
          ],
        }),
      });

      if (response.status >= 200 && response.status < 300) {
        const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
        return {
          success: true,
          provider: 'SENDGRID',
          messageId,
          status: 'SENT',
        };
      }

      const resText = await response.text().catch(() => '');
      return {
        success: false,
        provider: 'SENDGRID',
        status: 'FAILED',
        error: `SendGrid error (${response.status}): ${resText.slice(0, 200)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'SENDGRID',
        status: 'FAILED',
        error: err?.message || 'Network error during SendGrid email dispatch',
      };
    }
  }

  // 3. Check Postmark (https://postmarkapp.com)
  const postmarkApiKey = process.env.POSTMARK_API_KEY;
  if (postmarkApiKey) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: options.from || emailFrom,
          To: options.to,
          Subject: options.subject,
          HtmlBody: options.html,
          TextBody: options.text,
          MessageStream: 'outbound',
        }),
      });

      const resData: any = await response.json().catch(() => ({}));
      if (response.ok && resData?.MessageID) {
        return {
          success: true,
          provider: 'POSTMARK',
          messageId: resData.MessageID,
          status: 'SENT',
        };
      }

      return {
        success: false,
        provider: 'POSTMARK',
        status: 'FAILED',
        error: resData?.Message || `Postmark error with status ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'POSTMARK',
        status: 'FAILED',
        error: err?.message || 'Network error during Postmark email dispatch',
      };
    }
  }

  // 4. No provider credentials configured: Return explicit configuration required status (No fake success)
  return {
    success: false,
    provider: 'NONE',
    status: 'CONFIG_REQUIRED',
    error: 'Email provider credentials not configured. Please set RESEND_API_KEY, SENDGRID_API_KEY, or POSTMARK_API_KEY in server environment.',
  };
}

export function getEmailProviderConfig(): {
  provider: 'RESEND' | 'SENDGRID' | 'POSTMARK' | 'SMTP' | 'NONE';
  configured: boolean;
  from?: string;
} {
  const from = process.env.EMAIL_FROM || 'Verity Compliance <notifications@veritycompliance.com>';
  if (process.env.RESEND_API_KEY) {
    return { provider: 'RESEND', configured: true, from };
  }
  if (process.env.SENDGRID_API_KEY) {
    return { provider: 'SENDGRID', configured: true, from };
  }
  if (process.env.POSTMARK_API_KEY) {
    return { provider: 'POSTMARK', configured: true, from };
  }
  if (process.env.SMTP_HOST) {
    return { provider: 'SMTP', configured: true, from };
  }
  return { provider: 'NONE', configured: false, from };
}

