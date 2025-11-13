import { forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutosuggestInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showClearButton?: boolean;
  isDropdownOpen?: boolean;
}

const AutosuggestInput = forwardRef<HTMLInputElement, AutosuggestInputProps>(
  ({ className, onClear, showClearButton = false, isDropdownOpen = false, value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0;

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          className={cn("pr-10", className)}
          {...props}
        />
        
        {isDropdownOpen && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : hasValue && showClearButton && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-xs">Limpar</span>
          </Button>
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>
    );
  }
);

AutosuggestInput.displayName = "AutosuggestInput";

export { AutosuggestInput };
