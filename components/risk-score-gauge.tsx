'use client';

// components/risk-score-gauge.tsx
// Animated circular gauge showing 0-100 risk score with color coding.
// Includes animated count-up and glow pulse effect.

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useState, useEffect } from 'react';

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
  const [displayScore, setDisplayScore] = useState(0);

  // Animated count-up effect
  useEffect(() => {
    setDisplayScore(0);
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), score);
      setDisplayScore(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div
      className="flex flex-col items-center gap-3"
      role="meter"
      aria-label={`Risk score: ${score} out of 100, ${riskLevel} risk`}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="w-40 h-40 sm:w-48 sm:h-48 animate-gauge-glow" style={{ color }}>
        <CircularProgressbar
          value={displayScore}
          text={`${displayScore}`}
          styles={buildStyles({
            pathColor: color,
            textColor: '#fafafa',
            trailColor: '#262626',
            textSize: '28px',
            pathTransitionDuration: 0.8,
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

