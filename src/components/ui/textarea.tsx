import * as React from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: "default" | "success" | "error";
  showStateIcon?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state = "default", showStateIcon = false, ...props }, ref) => {
    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pointer-events-auto",
            state === "success" && "border-green-500 focus-visible:ring-green-500",
            state === "error" && "border-red-500 focus-visible:ring-red-500",
            showStateIcon && "pr-10",
            className,
          )}
          ref={ref}
          {...props}
        />
        {showStateIcon && state === "success" && (
          <Check className="absolute right-3 top-3 h-4 w-4 text-green-500 animate-in zoom-in-50 duration-200" />
        )}
        {showStateIcon && state === "error" && (
          <X className="absolute right-3 top-3 h-4 w-4 text-red-500 animate-in zoom-in-50 duration-200" />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
