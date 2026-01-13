"use client";

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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Status {
  id: string;
  tenTrangThai: string;
}

interface StatusSelectProps {
  statuses: Status[];
  value?: string;
  onChange: (value: string) => void;
}

export function StatusSelect({ statuses, value, onChange }: StatusSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedStatusName = React.useMemo(() => {
    return statuses.find(s => s.id === value)?.tenTrangThai || "";
  }, [value, statuses]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal"
        >
          <span className={cn(!selectedStatusName && "text-muted-foreground")}>
            {selectedStatusName || "Chọn trạng thái"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm trạng thái..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy trạng thái.</CommandEmpty>
            <CommandGroup>
              {statuses.map((status) => (
                <CommandItem
                  key={status.id}
                  onSelect={() => {
                    onChange(status.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === status.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{status.tenTrangThai}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
