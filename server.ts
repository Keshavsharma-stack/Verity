import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  handleProcessExtraction,
  handleManualVerification,
  handleHealth,
} from './src/server/extractionLogic';
import {
  handleSendNotification,
  handleProcessQueue,
} from './src/server/reminderLogic';
import {
  handleGetNotifications,
  handleScanNotifications,
  handleUpdateNotificationRead,
  handleMarkAllNotificationsRead,
  handleCronProcessExpirations,
} from './src/server/notificationLogic';
import {
  handleCheckout,
  handlePortal,
  handleStripeWebhook,
} from './src/server/billingLogic';

dotenv.config();

const app = express();
const PORT = 3000;

// Stripe Webhook needs raw body before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  return handleStripeWebhook(req, res);
});

app.use(express.json({ limit: '25mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  return handleHealth(req, res);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(process.cwd(), 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(process.cwd(), 'sitemap.xml'));
});

// -----------------------------------------------------------------------------
// POST /api/documents/process-extraction
// Production AI Document Intelligence & OCR Extraction Pipeline
// -----------------------------------------------------------------------------
app.post('/api/documents/process-extraction', async (req, res) => {
  return handleProcessExtraction(req, res);
});

// -----------------------------------------------------------------------------
// POST /api/documents/verify-manual
// Human Review / Verification Endpoint
// -----------------------------------------------------------------------------
app.post('/api/documents/verify-manual', async (req, res) => {
  return handleManualVerification(req, res);
});

// -----------------------------------------------------------------------------
// POST /api/reminders/send-notification
// Production Transactional Email Dispatch Endpoint
// -----------------------------------------------------------------------------
app.post('/api/reminders/send-notification', async (req, res) => {
  return handleSendNotification(req, res);
});

// -----------------------------------------------------------------------------
// POST /api/reminders/process-queue
// Scheduled Reminder Queue Processor Endpoint
// -----------------------------------------------------------------------------
app.post('/api/reminders/process-queue', async (req, res) => {
  return handleProcessQueue(req, res);
});

// -----------------------------------------------------------------------------
// POST /api/billing/checkout & /api/billing/portal
// Stripe Billing & Customer Portal Endpoints
// -----------------------------------------------------------------------------
app.post('/api/billing/checkout', async (req, res) => {
  return handleCheckout(req, res);
});

app.post('/api/billing/portal', async (req, res) => {
  return handlePortal(req, res);
});

// -----------------------------------------------------------------------------
// NOTIFICATIONS API (Expiration Radar Alerts & Persistence)
// -----------------------------------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  return handleGetNotifications(req, res);
});

app.post('/api/notifications/scan', async (req, res) => {
  return handleScanNotifications(req, res);
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  return handleUpdateNotificationRead(req, res);
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  return handleMarkAllNotificationsRead(req, res);
});

// -----------------------------------------------------------------------------
// CRON API (Scheduled Expiration Processing)
// -----------------------------------------------------------------------------
app.post('/api/cron/process-expirations', async (req, res) => {
  return handleCronProcessExpirations(req, res);
});

// -----------------------------------------------------------------------------
// Vite Middleware / Static Serving
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Verity server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
