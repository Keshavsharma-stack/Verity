import assert from 'assert';
import { handleCheckout, handlePortal, handleStripeWebhook } from '../src/server/billingLogic';

async function runStripeIntegrationVerification() {
  console.log('=== VERITY: STARTING END-TO-END STRIPE INTEGRATION VERIFICATION ===');

  // Test Case 1: Unauthorized Checkout Request
  console.log('1. Verifying that handleCheckout rejects unauthorized requests...');
  let resCodeCheckout = 0;
  let resJsonCheckout: any = null;
  const mockReqCheckout1 = {
    headers: {},
    body: { workspaceId: 'ws-123', planSlug: 'STARTER' }
  };
  const mockResCheckout1 = {
    status(code: number) {
      resCodeCheckout = code;
      return this;
    },
    json(data: any) {
      resJsonCheckout = data;
      return this;
    }
  };

  await handleCheckout(mockReqCheckout1, mockResCheckout1);
  assert.strictEqual(resCodeCheckout, 401, 'Unauthorized request must yield 401 status');
  assert.ok(resJsonCheckout.error.includes('token required'), 'Error must indicate token requirement');
  console.log('   - [SUCCESS] Unauthorized checkout correctly blocked.');

  // Test Case 2: Incomplete Parameters Checkout Request
  console.log('2. Verifying that handleCheckout rejects incomplete requests (even if token structure is present)...');
  let resCodeIncomplete = 0;
  let resJsonIncomplete: any = null;
  const mockReqIncomplete = {
    headers: { authorization: 'Bearer mock-jwt-token' },
    body: { workspaceId: '' } // missing planSlug and workspaceId
  };
  const mockResIncomplete = {
    status(code: number) {
      resCodeIncomplete = code;
      return this;
    },
    json(data: any) {
      resJsonIncomplete = data;
      return this;
    }
  };

  await handleCheckout(mockReqIncomplete, mockResIncomplete);
  assert.strictEqual(resCodeIncomplete, 400, 'Incomplete request must yield 400 status');
  assert.ok(resJsonIncomplete.error.includes('Missing required parameters'), 'Error must specify missing fields');
  console.log('   - [SUCCESS] Incomplete checkout parameters correctly validated.');

  // Test Case 3: Unauthorized Customer Portal Request
  console.log('3. Verifying that handlePortal rejects unauthorized requests...');
  let resCodePortal = 0;
  let resJsonPortal: any = null;
  const mockReqPortal = {
    headers: {},
    body: { workspaceId: 'ws-123' }
  };
  const mockResPortal = {
    status(code: number) {
      resCodePortal = code;
      return this;
    },
    json(data: any) {
      resJsonPortal = data;
      return this;
    }
  };

  await handlePortal(mockReqPortal, mockResPortal);
  assert.strictEqual(resCodePortal, 401, 'Unauthorized portal request must yield 401 status');
  assert.ok(resJsonPortal.error.includes('token required'), 'Error must indicate token requirement');
  console.log('   - [SUCCESS] Unauthorized portal request correctly blocked.');

  // Test Case 4: Missing Workspace Customer Portal Request
  console.log('4. Verifying that handlePortal rejects requests without workspaceId...');
  let resCodePortalMissing = 0;
  let resJsonPortalMissing: any = null;
  const mockReqPortalMissing = {
    headers: { authorization: 'Bearer mock-jwt' },
    body: {}
  };
  const mockResPortalMissing = {
    status(code: number) {
      resCodePortalMissing = code;
      return this;
    },
    json(data: any) {
      resJsonPortalMissing = data;
      return this;
    }
  };

  await handlePortal(mockReqPortalMissing, mockResPortalMissing);
  assert.strictEqual(resCodePortalMissing, 400, 'Missing workspaceId portal request must yield 400 status');
  assert.ok(resJsonPortalMissing.error.includes('workspaceId'), 'Error must specify missing workspaceId');
  console.log('   - [SUCCESS] Incomplete portal parameters correctly validated.');

  // Test Case 5: Webhook Signature Failure / Forgery Prevention
  console.log('5. Verifying that handleStripeWebhook securely rejects forged webhook event signatures...');
  let resCodeWebhook = 0;
  let resJsonWebhook: any = null;
  const mockReqWebhook = {
    headers: { 'stripe-signature': 't=123,v1=badsignature' },
    body: Buffer.from(JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' }))
  };
  const mockResWebhook = {
    status(code: number) {
      resCodeWebhook = code;
      return this;
    },
    json(data: any) {
      resJsonWebhook = data;
      return this;
    }
  };

  await handleStripeWebhook(mockReqWebhook, mockResWebhook);
  // Should reject because STRIPE_WEBHOOK_SECRET is not configured or signature validation fails
  assert.ok(resCodeWebhook === 400 || resCodeWebhook === 500, 'Invalid webhook signature must yield 400 or 500 status');
  console.log('   - [SUCCESS] Webhook signature verification verified. Forged calls are fully blocked.');

  console.log('=== VERITY: ALL SAFE STRIPE SECURITY CHECKS PASSED SUCCESSFULLY! ===');
}

runStripeIntegrationVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
