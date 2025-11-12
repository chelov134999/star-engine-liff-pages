import React from 'react';
import './styles.scss';

export interface GuardianNavItem {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export interface GuardianHeaderProps {
  logoText?: string;
  navItems?: GuardianNavItem[];
  rightSlot?: React.ReactNode;
}

export const GuardianHeader: React.FC<GuardianHeaderProps> = ({
  logoText = 'Guardian V2',
  navItems = [],
  rightSlot,
}) => (
  <header className="guardian-header">
    <div className="guardian-logo">{logoText}</div>
    {navItems.length > 0 && (
      <nav className="guardian-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`guardian-nav__item${item.active ? ' guardian-nav__item--active' : ''}`}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
      </nav>
    )}
    {rightSlot}
  </header>
);

export interface GuardianModeToggleOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface GuardianModeToggleProps<T extends string> {
  value: T;
  options: GuardianModeToggleOption<T>[];
  onChange: (nextValue: T) => void;
}

export const GuardianModeToggle = <T extends string>({
  value,
  options,
  onChange,
}: GuardianModeToggleProps<T>) => (
  <div className="guardian-toggle">
    {options.map((option) => (
      <button
        key={String(option.value)}
        type="button"
        className={`guardian-toggle__option${value === option.value ? ' is-active' : ''}`}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export interface GuardianHeroCardMetric {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
}

export interface GuardianHeroCardAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
}

export interface GuardianHeroCardProps {
  title: string;
  meta?: string;
  metrics?: GuardianHeroCardMetric[];
  actions?: GuardianHeroCardAction[];
  children?: React.ReactNode;
  className?: string;
}

export const GuardianHeroCard: React.FC<GuardianHeroCardProps> = ({
  title,
  meta,
  metrics = [],
  actions = [],
  children,
  className = '',
}) => (
  <section className={`guardian-section guardian-hero-card ${className}`.trim()}>
    <div className="guardian-hero">
      <div>
        <h2>{title}</h2>
        {meta && <p className="guardian-hero__meta">{meta}</p>}
      </div>
      <div className="guardian-hero__metrics">
        {metrics.length > 0 && <MetricGrid metrics={metrics} />}
        {actions.length > 0 && (
          <div className="guardian-hero__actions">
            {actions.map((action) => (
              <QuickActionButton key={action.label} {...action} />
            ))}
          </div>
        )}
      </div>
    </div>
    {children}
  </section>
);

export interface MetricGridProps {
  metrics: GuardianHeroCardMetric[];
}

export const MetricGrid: React.FC<MetricGridProps> = ({ metrics }) => (
  <div className="guardian-metric-grid">
    {metrics.map((metric) => (
      <div key={metric.label} className="guardian-metric">
        <span className="guardian-metric__label">{metric.label}</span>
        <span className="guardian-metric__value">{metric.value}</span>
        {metric.description && (
          <span className="guardian-metric__description">{metric.description}</span>
        )}
      </div>
    ))}
  </div>
);

export interface QuickActionButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  label,
  variant = 'secondary',
  onClick,
  disabled,
}) => (
  <button
    type="button"
    className={`guardian-btn guardian-btn--${variant}`}
    onClick={onClick}
    disabled={disabled}
  >
    {label}
  </button>
);

export const exampleHeroCardProps: GuardianHeroCardProps = {
  title: '星級引擎 台北信義店',
  meta: '報表日期 2024-10-30 · 方案 PRO',
  metrics: [
    { label: '守護分數', value: 89, description: '較上週 +6' },
    { label: 'AI 成本', value: '$2.45', description: '本週佔比 12%' },
  ],
  actions: [
    { label: '查看完整報表', variant: 'primary' },
    { label: '下載 PDF', variant: 'ghost' },
  ],
  children: <p className="guardian-card__highlight">此為元件使用示例，實際資料由 API 填入。</p>,
};
