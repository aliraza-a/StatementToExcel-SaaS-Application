'use client';

import Script from 'next/script';

export function PaddleLoader() {
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-expect-error Paddle is injected globally by the script
        if (typeof window !== 'undefined' && window.Paddle) {
          // @ts-expect-error Paddle is injected globally by the script
          window.Paddle.Initialize({
            environment,
            token: clientToken,
          });
        }
      }}
    />
  );
}
