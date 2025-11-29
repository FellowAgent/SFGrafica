import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => {
  const [position, setPosition] = React.useState(() => {
    const saved = localStorage.getItem('toastPosition');
    return saved ? JSON.parse(saved) : { altura: "top", lado: "right" };
  });

  React.useEffect(() => {
    const handlePositionChange = () => {
      const saved = localStorage.getItem('toastPosition');
      if (saved) {
        setPosition(JSON.parse(saved));
      }
    };

    window.addEventListener('toastPositionChange', handlePositionChange);
    return () => window.removeEventListener('toastPositionChange', handlePositionChange);
  }, []);

  const positionClasses = {
    top: "top-4",
    center: "top-1/2 -translate-y-1/2",
    bottom: "bottom-4",
  };

  const sideClasses = {
    left: "left-4",
    right: "right-4",
  };

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed z-[9999] flex max-h-screen w-full flex-col p-4 md:max-w-[420px]",
        positionClasses[position.altura as keyof typeof positionClasses],
        sideClasses[position.lado as keyof typeof sideClasses],
        className,
      )}
      {...props}
    />
  );
});
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-5 pr-8 shadow-2xl backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out hover:scale-[1.02] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]",
  {
    variants: {
      variant: {
        default: "border-slate-500/30 bg-gradient-to-br from-slate-950/95 to-slate-900/95 text-slate-50",
        destructive: "border-red-500/40 bg-gradient-to-br from-red-950/95 to-red-900/90 text-red-50 shadow-red-500/20",
        success: "border-green-500/40 bg-gradient-to-br from-green-950/95 to-emerald-900/90 text-green-50 shadow-green-500/20",
        warning: "border-amber-500/40 bg-gradient-to-br from-amber-950/95 to-orange-900/90 text-amber-50 shadow-amber-500/20",
        info: "border-cyan-500/40 bg-gradient-to-br from-cyan-950/95 to-blue-900/90 text-cyan-50 shadow-cyan-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & 
    VariantProps<typeof toastVariants> & 
    { showIcon?: boolean; showProgress?: boolean; duration?: number }
>(({ className, variant, showIcon = true, showProgress = false, duration = 2000, ...props }, ref) => {
  const [isPaused, setIsPaused] = React.useState(false);

  const icons = {
    default: <Info className="h-6 w-6 text-blue-400" />,
    destructive: <AlertCircle className="h-6 w-6 text-red-400" />,
    success: <CheckCircle2 className="h-6 w-6 text-green-400" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-400" />,
    info: <Info className="h-6 w-6 text-cyan-400" />,
  };

  const progressColors = {
    default: "bg-gradient-to-r from-slate-400/80 to-slate-300/60",
    destructive: "bg-gradient-to-r from-red-400/80 to-red-300/60",
    success: "bg-gradient-to-r from-green-400/80 to-emerald-300/60",
    warning: "bg-gradient-to-r from-amber-400/80 to-orange-300/60",
    info: "bg-gradient-to-r from-cyan-400/80 to-blue-300/60",
  };

  return (
    <ToastPrimitives.Root 
      ref={ref} 
      className={cn(toastVariants({ variant }), className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      {...props}
    >
      <div className="flex items-start gap-3 w-full">
        {showIcon && variant && icons[variant]}
        <div className="flex-1 grid gap-1">{props.children}</div>
      </div>
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div 
            className={cn(
              "h-full animate-toast-progress origin-right",
              variant ? progressColors[variant] : progressColors.default,
              isPaused && "[animation-play-state:paused]"
            )}
            style={{
              animationDuration: `${duration}ms`
            }}
          />
        </div>
      )}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors group-[.destructive]:border-muted/40 hover:bg-secondary group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:focus:ring-destructive disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold leading-none", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
