'use client';

import { useEffect } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

// Create a global reference to easily access Paddle anywhere in the app
declare global {
  interface Window {
    paddleInstance?: Paddle;
  }
}

export function PaddleLoader() {
  useEffect(() => {
    const initPaddle = async () => {
      const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

      if (!clientToken) {
        console.warn('Paddle client token is missing. Checkout will not work.');
        return;
      }

      if (!window.paddleInstance) {
        window.paddleInstance = await initializePaddle({
          environment,
          token: clientToken,
        });
      }
    };

    initPaddle();
  }, []);

  return null;
}
