"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type HelpHintProps = {
  children: React.ReactNode
  label?: string
  icon?: React.ReactNode
  triggerClassName?: string
  contentClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

function useHoverCapable() {
  const [hoverCapable, setHoverCapable] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setHoverCapable(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return hoverCapable
}

export function HelpHint({
  children,
  label = "Help",
  icon,
  triggerClassName,
  contentClassName,
  align = "center",
  side,
}: HelpHintProps) {
  const [open, setOpen] = React.useState(false)
  const hoverCapable = useHoverCapable()
  const timer = React.useRef<number | null>(null)

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const scheduleOpen = React.useCallback(() => {
    clearTimer()
    timer.current = window.setTimeout(() => setOpen(true), 100)
  }, [clearTimer])

  const scheduleClose = React.useCallback(() => {
    clearTimer()
    timer.current = window.setTimeout(() => setOpen(false), 150)
  }, [clearTimer])

  React.useEffect(() => clearTimer, [clearTimer])

  const hoverProps = hoverCapable
    ? { onPointerEnter: scheduleOpen, onPointerLeave: scheduleClose }
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className={triggerClassName} {...hoverProps}>
          {icon ?? <HelpCircle className="h-4 w-4 text-primary" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className={contentClassName ?? "text-sm"}
        onPointerEnter={hoverCapable ? clearTimer : undefined}
        onPointerLeave={hoverCapable ? scheduleClose : undefined}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
