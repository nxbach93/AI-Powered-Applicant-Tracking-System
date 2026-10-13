import React from 'react';

interface AiMatchGaugeProps {
  score: number | null | undefined;
  variant?: 'pill' | 'gauge';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function AiMatchGauge({
  score,
  variant = 'pill',
  size = 'md',
  showLabel = true,
  className = '',
}: AiMatchGaugeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        <span>Chờ đánh giá</span>
      </span>
    );
  }

  const roundedScore = Math.round(score * 10) / 10;

  // Determine semantic color tier
  let tierConfig = {
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-600',
    strokeColor: '#059669',
    label: 'Rất cao',
  };

  if (score >= 85) {
    tierConfig = {
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      dotClass: 'bg-emerald-600',
      strokeColor: '#059669',
      label: 'Khớp cao',
    };
  } else if (score >= 70) {
    tierConfig = {
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/90',
      dotClass: 'bg-blue-600',
      strokeColor: '#2563EB',
      label: 'Phù hợp',
    };
  } else if (score >= 50) {
    tierConfig = {
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
      dotClass: 'bg-amber-500',
      strokeColor: '#D97706',
      label: 'Cân nhắc',
    };
  } else {
    tierConfig = {
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
      dotClass: 'bg-rose-600',
      strokeColor: '#DC2626',
      label: 'Chưa tối ưu',
    };
  }

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-2xs ${tierConfig.badgeClass} ${className}`}
        title={`Điểm AI Neural Match: ${roundedScore}% (${tierConfig.label})`}
      >
        <span className="font-tabular-mono font-bold text-xs sm:text-[13px] tracking-tight">
          {roundedScore}%
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${tierConfig.dotClass}`} />
        {showLabel && (
          <span className="text-[11px] font-medium hidden sm:inline">
            {tierConfig.label}
          </span>
        )}
      </div>
    );
  }

  // Circular Gauge variant (for detail and profile headers)
  const radius = size === 'lg' ? 44 : size === 'md' ? 32 : 24;
  const stroke = size === 'lg' ? 7 : size === 'md' ? 5 : 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const svgSize = radius * 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg height={svgSize} width={svgSize} className="-rotate-90 transform">
        <circle
          stroke="#E2E8F0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={tierConfig.strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span
          className={`font-tabular-mono font-extrabold text-slate-900 leading-none ${
            size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs'
          }`}
        >
          {Math.round(score)}%
        </span>
        {size === 'lg' && (
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
            {tierConfig.label}
          </span>
        )}
      </div>
    </div>
  );
}
