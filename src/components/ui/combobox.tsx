"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options?: { label: string; value: string }[]
  allowCustom?: boolean
}

export function Combobox({
  value,
  onValueChange,
  placeholder = "Select...",
  options = [],
  allowCustom = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue
    onValueChange?.(newValue)
    setSearchValue("")
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setSearchValue(newValue)
    if (allowCustom && newValue) {
      onValueChange?.(newValue)
    }
  }

  const getDisplayValue = () => {
    if (value) {
      const selectedOption = options.find(opt => opt.value === value)
      return selectedOption ? selectedOption.label : value
    }
    return placeholder
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9"
        >
          {getDisplayValue()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type..."
            value={searchValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}