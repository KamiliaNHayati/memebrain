'use client';

// components/risk-score-gauge.tsx
// Animated circular gauge showing 0-100 risk score with color coding.

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface RiskScoreGaugeProps {
  score: number;
  riskLevel: string;
}

function getRiskColor(score: number): string {
  if (score >= 90) return '#22c55e'; // Green — LOW
  if (score >= 60) return '#facc15'; // Yellow — MEDIUM
  if (score >= 30) return '#f59e0b'; // Orange — HIGH
  return '#ef4444';                  // Red — CRITICAL
}

function getRiskEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 30) return '🟠';
  return '🔴';
}

export function RiskScoreGauge({ score, riskLevel }: RiskScoreGaugeProps) {
  const color = getRiskColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-40 h-40 sm:w-48 sm:h-48">
        <CircularProgressbar
          value={score}
          text={`${score}`}
          styles={buildStyles({
            pathColor: color,
            textColor: '#fafafa',
            trailColor: '#262626',
            textSize: '28px',
            pathTransitionDuration: 1,
          })}
        />
      </div>
      <div className="text-center">
        <div
          className="text-sm font-bold tracking-wider"
          style={{ color }}
        >
          {getRiskEmoji(score)} {riskLevel} RISK
        </div>
        <div className="text-xs text-[#71717a] mt-1">out of 100</div>
      </div>
    </div>
  );
}

export { getRiskColor, getRiskEmoji };
