import * as React from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  state?: "default" | "success" | "error";
  showStateIcon?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, state = "default", showStateIcon = false, ...props }, ref) => {
    const [animationState, setAnimationState] = React.useState<string>("");

    React.useEffect(() => {
      if (state === "success") {
        setAnimationState("animate-success-flash");
        const timer = setTimeout(() => setAnimationState(""), 600);
        return () => clearTimeout(timer);
      } else if (state === "error") {
        setAnimationState("animate-error-flash animate-shake");
        const timer = setTimeout(() => setAnimationState(""), 600);
        return () => clearTimeout(timer);
      }
    }, [state]);

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pointer-events-auto transition-all duration-200",
            showStateIcon && "pr-10",
            state === "success" && "border-green-500/50",
            state === "error" && "border-destructive/50",
            animationState,
            className,
          )}
          ref={ref}
          {...props}
        />
        {showStateIcon && state === "success" && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 animate-fade-in" />
        )}
        {showStateIcon && state === "error" && (
          <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive animate-fade-in" />
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
