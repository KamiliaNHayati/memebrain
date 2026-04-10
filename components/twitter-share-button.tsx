'use client';

// components/twitter-share-button.tsx
// Pre-filled Twitter/X share button for scan results.
// Generates intent URL with risk score, token address, and optional honeypot warning.

import { getRiskEmoji } from './risk-score-gauge';

interface TwitterShareButtonProps {
  tokenAddress: string;
  score: number;
  riskLevel: string;
  isHoneypot?: boolean;
  variant?: 'default' | 'danger';
  label?: string;
}

function buildTweetText(props: TwitterShareButtonProps): string {
  const { tokenAddress, score, riskLevel, isHoneypot } = props;
  const emoji = getRiskEmoji(score);
  const shortAddr = `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;

  let text = `I just scanned a token on @four_meme with MemeBrain AI.\n`;
  text += `Risk Score: ${score}/100 ${emoji} ${riskLevel}\n`;
  text += `Token: ${shortAddr}\n`;

  if (isHoneypot) {
    text += `\n🚨 Honeypot detected! Sell transactions will fail.\n`;
  }

  text += `\nScan yours: https://memebrain.vercel.app/scan\n`;
  text += `#FourMeme #MemeBrain #BNBChain`;

  return text;
}

export function TwitterShareButton({
  tokenAddress,
  score,
  riskLevel,
  isHoneypot = false,
  variant = 'default',
  label = '𝕏 Share on X',
}: TwitterShareButtonProps) {
  const tweetText = buildTweetText({ tokenAddress, score, riskLevel, isHoneypot });
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const baseStyles =
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer';

  const variantStyles =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-500 ring-1 ring-red-400/30'
      : 'bg-[#1a1a1a] text-white border border-[#333] hover:bg-[#262626] hover:border-[#444]';

  return (
    <a
      href={intentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${variantStyles}`}
    >
      {label}
    </a>
  );
}
