declare global {
  interface Window {
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => {
      subscriptionsCheckout: (options: {
        subsSessionId: string;
        subscriptionSessionId?: string;
        redirectTarget?: '_self' | '_blank' | '_modal';
      }) => Promise<any>;
      checkout?: (options: any) => Promise<any>;
    };
  }
}

let cashfreeSdkPromise: Promise<any> | null = null;

export function loadCashfreeSDK(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined in server-side context'));
  }

  if (window.Cashfree) {
    return Promise.resolve(window.Cashfree);
  }

  if (cashfreeSdkPromise) {
    return cashfreeSdkPromise;
  }

  cashfreeSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('cashfree-js-sdk') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.Cashfree) {
        return resolve(window.Cashfree);
      }
      existingScript.addEventListener('load', () => {
        if (window.Cashfree) {
          resolve(window.Cashfree);
        } else {
          reject(new Error('Cashfree SDK script loaded but window.Cashfree is unavailable.'));
        }
      });
      existingScript.addEventListener('error', () => {
        cashfreeSdkPromise = null;
        reject(new Error('Failed to load Cashfree JS SDK script.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'cashfree-js-sdk';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree);
      } else {
        reject(new Error('Cashfree SDK loaded but window.Cashfree is undefined.'));
      }
    };
    script.onerror = () => {
      cashfreeSdkPromise = null;
      reject(new Error('Failed to load Cashfree JS SDK from CDN.'));
    };
    document.head.appendChild(script);
  });

  return cashfreeSdkPromise;
}
