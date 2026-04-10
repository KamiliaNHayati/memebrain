'use client';

// components/honeypot-banner.tsx
// Prominent red banner when Rule 1 (Honeypot) triggers.
// Includes "Warn Others on X" CTA button.

import { TwitterShareButton } from './twitter-share-button';

interface HoneypotBannerProps {
  message: string;
  tokenAddress: string;
  score: number;
  riskLevel: string;
}

export function HoneypotBanner({ message, tokenAddress, score, riskLevel }: HoneypotBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-red-500/60 bg-red-950/40 p-5 sm:p-6">
      {/* Animated glow pulse */}
      <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />

      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <h3 className="text-base sm:text-lg font-bold text-red-400 tracking-wide">
            HONEYPOT DETECTOR: CRITICAL THREAT
          </h3>
        </div>

        {/* Divider */}
        <div className="h-px bg-red-500/30" />

        {/* Message */}
        <p className="text-sm text-red-200/90 leading-relaxed">
          {message}
        </p>

        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">
          ⚠️ DO NOT BUY THIS TOKEN
        </p>

        {/* CTA */}
        <div className="pt-1">
          <TwitterShareButton
            tokenAddress={tokenAddress}
            score={score}
            riskLevel={riskLevel}
            isHoneypot={true}
            variant="danger"
            label="🚨 Warn Others on X"
          />
        </div>
      </div>
    </div>
  );
}
