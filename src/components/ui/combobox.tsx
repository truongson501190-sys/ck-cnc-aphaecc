import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: ComboboxOption[];
  allowCustom?: boolean;
  className?: string;
}

export function Combobox({
  value,
  onValueChange,
  placeholder = "Chọn...",
  options,
  allowCustom = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedLabel = options.find((opt) => opt.value === value)?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white text-black border-gray-300 font-normal hover:bg-gray-50",
            !value && "text-gray-500",
            className
          )}
        >
          {value ? selectedLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      {/* z-[9999] đảm bảo không bị bảng đè lên, bg-white text-black để fix Dark Mode */}
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[9999] bg-white text-black border border-gray-200 shadow-xl">
        <Command className="bg-white text-black">
          <CommandInput 
            placeholder="Tìm kiếm..." 
            className="bg-white text-black"
            onValueChange={(val) => {
              setInputValue(val);
              if (allowCustom) {
                onValueChange(val);
              }
            }}
          />
          <CommandEmpty className="py-2 text-center text-sm text-gray-500">
            Không tìm thấy.
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto bg-white text-black">
            {allowCustom && inputValue && !options.find(o => o.value === inputValue) && (
              <CommandItem
                value={inputValue}
                onSelect={() => {
                  onValueChange(inputValue);
                  setOpen(false);
                }}
                className="cursor-pointer hover:bg-blue-50 text-black"
              >
                <Check className={cn("mr-2 h-4 w-4", value === inputValue ? "opacity-100" : "opacity-0")} />
                Dùng "{inputValue}"
              </CommandItem>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
                className="cursor-pointer hover:bg-blue-50 text-black"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}