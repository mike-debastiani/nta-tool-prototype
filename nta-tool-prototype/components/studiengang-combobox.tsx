"use client"

import * as React from "react"
import { Check, ChevronDownIcon } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { STUDIENGAENGE } from "@/lib/studiengaenge"
import { cn } from "@/lib/utils"

type StudiengangComboboxProps = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

/** Gleiche Trigger-Basis wie `SelectTrigger` + gleiche Overrides wie Semester-Feld in der Form */
const comboboxTriggerClassName = cn(
  "flex w-full min-w-0 cursor-text items-center justify-between gap-1.5 rounded-md border border-neutral-300 bg-background py-2 pr-2 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none",
  "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
  "dark:border-neutral-600 dark:bg-input/30 dark:focus-within:ring-ring/40",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
)

function filterStudiengaenge(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return STUDIENGAENGE
  return STUDIENGAENGE.map((g) => ({
    ...g,
    programs: g.programs.filter(
      (p) =>
        p.toLowerCase().includes(q) || g.department.toLowerCase().includes(q),
    ),
  })).filter((g) => g.programs.length > 0)
}

export function StudiengangCombobox({
  id,
  value,
  onValueChange,
  placeholder = "Studiengang wählen",
}: StudiengangComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = React.useState<number>()
  const listId = React.useId()

  const displayValue = open ? search : value

  const filtered = React.useMemo(() => filterStudiengaenge(search), [search])

  React.useLayoutEffect(() => {
    if (open && anchorRef.current) {
      setPopoverWidth(anchorRef.current.offsetWidth)
    }
  }, [open])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch("")
  }

  return (
    <div ref={anchorRef} className="relative w-full">
      <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
        <Command
          shouldFilter={false}
          className="h-auto min-h-0 w-full min-w-0 overflow-visible rounded-none bg-transparent p-0 shadow-none ring-0"
        >
          <PopoverAnchor asChild>
            <label
              htmlFor={id}
              className={cn(
                comboboxTriggerClassName,
                "h-9 min-h-9",
                open && "border-ring",
              )}
            >
              {/* Wie SelectTrigger: Textfeld + Chevron in einer Zeile, ohne vertikale Abtrennung */}
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center",
                  "[&_[data-slot=command-input-wrapper]]:w-full [&_[data-slot=command-input-wrapper]]:min-w-0 [&_[data-slot=command-input-wrapper]]:max-w-full [&_[data-slot=command-input-wrapper]]:flex-1 [&_[data-slot=command-input-wrapper]]:border-0 [&_[data-slot=command-input-wrapper]]:bg-transparent [&_[data-slot=command-input-wrapper]]:p-0",
                  "[&_[data-slot=input-group]]:h-auto [&_[data-slot=input-group]]:min-h-0 [&_[data-slot=input-group]]:w-full [&_[data-slot=input-group]]:min-w-0 [&_[data-slot=input-group]]:max-w-full [&_[data-slot=input-group]]:flex-1 [&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:px-0 [&_[data-slot=input-group]]:py-0 [&_[data-slot=input-group]]:shadow-none",
                  "[&_[data-slot=input-group-addon]]:hidden",
                  "[&_[data-slot=command-input]]:h-9 [&_[data-slot=command-input]]:min-h-9 [&_[data-slot=command-input]]:min-w-0 [&_[data-slot=command-input]]:w-full [&_[data-slot=command-input]]:max-w-full [&_[data-slot=command-input]]:flex-1 [&_[data-slot=command-input]]:basis-0 [&_[data-slot=command-input]]:border-0 [&_[data-slot=command-input]]:bg-transparent [&_[data-slot=command-input]]:px-0 [&_[data-slot=command-input]]:py-0 [&_[data-slot=command-input]]:text-sm [&_[data-slot=command-input]]:shadow-none",
                  "[&_[data-slot=command-input]]:placeholder:text-muted-foreground",
                )}
              >
                <CommandInput
                  id={id}
                  role="combobox"
                  aria-expanded={open}
                  aria-haspopup="listbox"
                  aria-controls={open ? listId : undefined}
                  placeholder={placeholder}
                  aria-autocomplete="list"
                  value={displayValue}
                  className="min-w-0 flex-1 basis-0 text-left text-foreground placeholder:text-muted-foreground"
                  onValueChange={(next: string) => {
                    setSearch(next)
                    setOpen(true)
                  }}
                  onFocus={() => {
                    setOpen(true)
                    setSearch("")
                  }}
                />
              </div>
              <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
            </label>
          </PopoverAnchor>

          <PopoverContent
            data-slot="combobox-content"
            id={listId}
            role="listbox"
            align="start"
            side="bottom"
            sideOffset={4}
            onOpenAutoFocus={(e: Event) => e.preventDefault()}
            onCloseAutoFocus={(e: Event) => e.preventDefault()}
            className={cn(
              "z-[100] max-h-80 gap-0 overflow-hidden rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10",
            )}
            style={
              popoverWidth
                ? { width: popoverWidth, minWidth: popoverWidth }
                : undefined
            }
          >
            <CommandList className="combobox-command-list max-h-[min(288px,calc(100vh-12rem))]">
              <CommandEmpty className="py-6 text-muted-foreground">
                Kein Studiengang gefunden.
              </CommandEmpty>
              {filtered.map((group, gi) => (
                <React.Fragment key={group.department}>
                  {gi > 0 ? (
                    <CommandSeparator className="my-0 opacity-100" />
                  ) : null}
                  <CommandGroup heading={group.department}>
                    {group.programs.map((program) => (
                      <CommandItem
                        key={program}
                        className="[&>svg:last-child]:hidden"
                        value={program}
                        keywords={[program, group.department]}
                        onSelect={() => {
                          onValueChange(program)
                          handleOpenChange(false)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {program}
                        </span>
                        <Check
                          className={cn(
                            "ml-auto size-4 shrink-0",
                            value === program ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              ))}
            </CommandList>
          </PopoverContent>
        </Command>
      </Popover>
    </div>
  )
}
