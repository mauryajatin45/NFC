import { cn } from "@/lib/utils";

interface InkScreenProps {
  children: React.ReactNode;
  className?: string;
}

export function InkScreen({ children, className }: InkScreenProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      className
    )}>
      {children}
    </div>
  );
}

interface InkHeaderProps {
  children?: React.ReactNode;
  dark?: boolean;
  className?: string;
  onBack?: () => void;
  orderContext?: string;
}

export function InkHeader({ children, dark = false, className, onBack, orderContext }: InkHeaderProps) {
  return (
    <>
      {orderContext && (
        <div className="bg-foreground text-background px-6 py-2.5 flex items-center justify-end">
          <span className="font-mono text-xs tracking-wide">{orderContext}</span>
        </div>
      )}
      <header className={cn(
        "px-6 py-5 flex items-center",
        dark ? "bg-ink-dark" : "bg-background",
        className
      )}>
        {onBack && (
          <button
            onClick={onBack}
            className={cn(
              "font-sans text-sm flex items-center gap-1 transition-opacity hover:opacity-70",
              dark ? "text-background/70" : "text-muted-foreground"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cancel
          </button>
        )}
        {children}
      </header>
    </>
  );
}

interface InkContentProps {
  children: React.ReactNode;
  className?: string;
}

export function InkContent({ children, className }: InkContentProps) {
  return (
    <main className={cn(
      "flex-1 px-8 pt-16 pb-12 flex flex-col items-center",
      className
    )}>
      <div className="w-full max-w-sm animate-fade-in">
        {children}
      </div>
    </main>
  );
}

interface InkHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function InkHeading({ children, className }: InkHeadingProps) {
  return (
    <h1 className={cn(
      "font-heading text-[28px] sm:text-[34px] leading-[1.1] font-semibold text-foreground text-center tracking-normal",
      className
    )}>
      {children}
    </h1>
  );
}

interface InkSubheadingProps {
  children: React.ReactNode;
  className?: string;
}

export function InkSubheading({ children, className }: InkSubheadingProps) {
  return (
    <p className={cn(
      "font-sans text-sm text-muted-foreground/80 text-center mt-3 leading-relaxed tracking-wide",
      className
    )}>
      {children}
    </p>
  );
}

interface InkLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export function InkLabel({ children, htmlFor, className }: InkLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block font-sans text-[11px] font-medium text-muted-foreground uppercase tracking-[0.2em] mb-3",
        className
      )}
    >
      {children}
    </label>
  );
}

interface InkHeroProps {
  children: React.ReactNode;
  className?: string;
}

export function InkHero({ children, className }: InkHeroProps) {
  return (
    <div className={cn(
      "bg-ink-dark text-background px-8 py-12",
      className
    )}>
      {children}
    </div>
  );
}
