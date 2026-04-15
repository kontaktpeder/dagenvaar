import { ReactNode, CSSProperties } from 'react';

interface ViewHeaderProps {
  variant: 'calendar' | 'list';
  onPrev: () => void;
  onNext: () => void;
  onTitleClick?: () => void;
  children: ReactNode;
  subtitle?: string;
  calendarStyle?: CSSProperties;
}

const ViewHeader = ({ variant, onPrev, onNext, onTitleClick, children, subtitle, calendarStyle }: ViewHeaderProps) => {
  const isCalendar = variant === 'calendar';

  const bg = isCalendar ? '' : 'bg-list-accent';
  const textColor = isCalendar ? 'text-white' : 'text-foreground';
  const arrowColor = isCalendar ? 'stroke-white' : 'stroke-current';
  const hoverBg = isCalendar ? 'hover:bg-white/15' : 'hover:bg-white/40';

  return (
    <div
      className={`${bg} rounded-b-3xl transition-all duration-300 ease-in-out`}
      style={isCalendar ? calendarStyle : undefined}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onPrev} className={`p-2 rounded-full ${hoverBg} active:scale-90 transition-all`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15L7 10L12 5" className={arrowColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={onTitleClick} className="text-center" disabled={!onTitleClick}>
          <h2 className={`text-xl font-extrabold capitalize ${textColor} tracking-wide`}>
            {children}
          </h2>
          {subtitle && (
            <p className={`text-sm mt-0.5 ${isCalendar ? 'text-white/70' : 'text-muted-foreground'}`}>
              {subtitle}
            </p>
          )}
        </button>
        <button onClick={onNext} className={`p-2 rounded-full ${hoverBg} active:scale-90 transition-all`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 5L13 10L8 15" className={arrowColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ViewHeader;
