'use client';

// components/audit-trail.tsx
// Tiered accordion display of all 8 risk rules.
// Tier 1 (Critical) — always expanded, red border
// Tier 2 (High) — expanded if triggered, orange border
// Tier 3 (Medium/Low/Info) — collapsed by default, yellow/gray border

import { useState } from 'react';

interface RiskRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  passed: boolean;
  scoreImpact: number;
  message: string;
}

interface AuditTrailProps {
  rules: RiskRule[];
}

function getBorderColor(severity: string, passed: boolean): string {
  if (passed) return 'border-l-emerald-500/50';
  switch (severity) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-yellow-500/50';
    default: return 'border-l-[#333]';
  }
}

function getImpactText(impact: number): string {
  if (impact > 0) return `+${impact} pts`;
  if (impact < 0) return `${impact} pts`;
  return '—';
}

function getImpactColor(impact: number): string {
  if (impact > 0) return 'text-emerald-400';
  if (impact < 0) return 'text-red-400';
  return 'text-[#52525b]';
}

function shouldExpand(rule: RiskRule): boolean {
  if (rule.severity === 'critical') return true;
  if (rule.severity === 'high' && !rule.passed) return true;
  return false;
}

function RuleCard({ rule }: { rule: RiskRule }) {
  const [expanded, setExpanded] = useState(shouldExpand(rule));

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left rounded-lg border border-[#262626] border-l-4 ${getBorderColor(
        rule.severity,
        rule.passed
      )} bg-[#111111] transition-all hover:bg-[#161616] ${
        !rule.passed && rule.severity === 'critical' ? 'ring-1 ring-red-500/20' : ''
      }`}
    >
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base shrink-0">
            {rule.passed ? '✅' : '❌'}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-medium text-white truncate block">
              {rule.name}
            </span>
            <span className="text-xs text-[#52525b] capitalize">
              {rule.severity}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-sm font-mono font-semibold ${getImpactColor(rule.scoreImpact)}`}>
            {getImpactText(rule.scoreImpact)}
          </span>
          <span className="text-[#52525b] text-xs">
            {expanded ? '▾' : '▸'}
          </span>
        </div>
      </div>

      {/* Body — expandable */}
      {expanded && (
        <div className="px-4 pb-3 pt-0">
          <div className="border-t border-[#262626] pt-3">
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              {rule.message}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}

export function AuditTrail({ rules }: AuditTrailProps) {
  // Sort: critical first, then high, then rest
  const sorted = [...rules].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    // Failed rules first within same severity
    if (a.severity === b.severity) {
      return (a.passed ? 1 : 0) - (b.passed ? 1 : 0);
    }
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider mb-3">
        Audit Trail
      </h3>
      {sorted.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
    </div>
  );
}
