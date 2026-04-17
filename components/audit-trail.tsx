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

// ── Icons by Severity ──────────────────────────────────────
const SEVERITY_ICONS = {
  critical: '🚨',
  high: '⚠️',
  medium: '⚡',
  low: 'ℹ️',
  info: '💡',
};

const SEVERITY_COLORS = {
  critical: 'from-red-500 to-red-600',
  high: 'from-orange-500 to-orange-600',
  medium: 'from-yellow-500 to-yellow-600',
  low: 'from-blue-500 to-blue-600',
  info: 'from-gray-500 to-gray-600',
};

const SEVERITY_BG = {
  critical: 'bg-red-500/10 border-red-500/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  medium: 'bg-yellow-500/10 border-yellow-500/30',
  low: 'bg-blue-500/10 border-blue-500/30',
  info: 'bg-gray-500/10 border-gray-500/30',
};

// ── Rule Card Component ────────────────────────────────────
function RuleCard({ rule }: { rule: RiskRule }) {
  const [expanded, setExpanded] = useState(rule.severity === 'critical' || (rule.severity === 'high' && !rule.passed));

  return (
    <div
      className={`rounded-xl border ${rule.passed ? 'border-emerald-500/20 bg-emerald-950/5' : SEVERITY_BG[rule.severity]} 
        transition-all duration-300 hover:shadow-lg overflow-hidden`}
    >
      {/* Header — Clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg
            ${rule.passed 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : `bg-gradient-to-br ${SEVERITY_COLORS[rule.severity]} text-white`
            }`}
          >
            {rule.passed ? '✓' : SEVERITY_ICONS[rule.severity]}
          </div>

          {/* Info */}
          <div className="text-left">
            <h4 className={`font-semibold ${rule.passed ? 'text-emerald-400' : 'text-white'}`}>
              {rule.name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${rule.passed 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : `bg-gradient-to-r ${SEVERITY_COLORS[rule.severity]} text-white`
                }`}
              >
                {rule.severity}
              </span>
              {rule.scoreImpact !== 0 && (
                <span className={`text-xs font-mono font-semibold
                  ${rule.scoreImpact > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {rule.scoreImpact > 0 ? '+' : ''}{rule.scoreImpact} pts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand Arrow */}
        <div className={`transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5">
          <div className="ml-14 p-4 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              {rule.message}
            </p>
            
            {/* Additional context for failed rules */}
            {!rule.passed && rule.severity === 'critical' && (
              <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                <p className="text-xs text-red-400 font-medium">
                  ⚠️ This is a critical security issue. Review carefully before trading.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Audit Trail Component ─────────────────────────────
export function AuditTrail({ rules }: AuditTrailProps) {
  // Group rules by severity
  const grouped = rules.reduce((acc, rule) => {
    if (!acc[rule.severity]) acc[rule.severity] = [];
    acc[rule.severity].push(rule);
    return acc;
  }, {} as Record<string, RiskRule[]>);

  // Sort within groups: failed first
  Object.keys(grouped).forEach(severity => {
    grouped[severity].sort((a, b) => (a.passed ? 1 : 0) - (b.passed ? 1 : 0));
  });

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const totalRules = rules.length;
  const passedRules = rules.filter(r => r.passed).length;
  const passRate = Math.round((passedRules / totalRules) * 100);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">
          Audit Trail
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            {passedRules}/{totalRules} checks passed
          </div>
          <div className="w-20 h-2 rounded-full bg-gray-800 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                passRate >= 80 ? 'bg-emerald-500' : passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rules by Severity */}
      <div className="space-y-4">
        {severityOrder.map(severity => {
          const severityRules = grouped[severity] || [];
          if (severityRules.length === 0) return null;

          return (
            <div key={severity} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS]}</span>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {severity} Priority
                </h4>
                <span className="text-xs text-gray-500">({severityRules.length})</span>
              </div>

              {/* Rules */}
              <div className="space-y-2">
                {severityRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* WBNB Tax Model Info */}
      {rules.some(r => r.name.includes('Founder') || r.name.includes('recipient')) && (
        <div className="mt-6 p-4 rounded-xl border border-blue-500/30 bg-blue-950/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="text-sm">
              <p className="font-semibold text-blue-400 mb-1">Tax Model Upgrade Detected</p>
              <p className="text-blue-300/80 leading-relaxed">
                Tokens created after block 90507362 distribute creator fees in WBNB (upgraded model).
                This ensures better compatibility and reliability across DeFi protocols.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}