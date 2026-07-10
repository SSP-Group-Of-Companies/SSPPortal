"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  const CurrentIcon = current.Icon;

  const select = useCallback(
    (value: Theme) => {
      setTheme(value);
      setOpen(false);
      setFocusedIdx(-1);
    },
    [setTheme]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setFocusedIdx(-1);
        buttonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => (i + 1) % THEMES.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => (i - 1 + THEMES.length) % THEMES.length);
      } else if ((e.key === "Enter" || e.key === " ") && focusedIdx >= 0) {
        e.preventDefault();
        select(THEMES[focusedIdx].value);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, focusedIdx, select]);

  // Move DOM focus when arrow keys navigate
  useEffect(() => {
    if (open && focusedIdx >= 0) {
      const btns = dropdownRef.current?.querySelectorAll<HTMLButtonElement>("button");
      btns?.[focusedIdx]?.focus();
    }
  }, [open, focusedIdx]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          setOpen((v) => !v);
          setFocusedIdx(-1);
        }}
        aria-label={`Theme: ${current.label}. Click to change`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-(--color-muted) transition hover:bg-(--color-surface-2) hover:text-(--color-text-strong)"
      >
        <CurrentIcon className="h-4.5 w-4.5" aria-hidden />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Choose theme"
          className="portal-card absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl py-1.5"
        >
          {THEMES.map(({ value, label, Icon }, idx) => {
            const active = theme === value;
            const focused = focusedIdx === idx;
            return (
              <button
                key={value}
                role="option"
                aria-selected={active}
                onClick={() => select(value)}
                onMouseEnter={() => setFocusedIdx(idx)}
                onMouseLeave={() => setFocusedIdx(-1)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition",
                  active
                    ? "bg-(--color-ssp-cyan-500)/8 font-medium text-(--color-ssp-cyan-600)"
                    : focused
                    ? "bg-(--color-surface-2) text-(--color-text-strong)"
                    : "text-(--color-text)"
                )}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? "var(--color-ssp-cyan-600)" : "var(--color-subtle)" }}
                  aria-hidden
                />
                <span className="flex-1 text-left">{label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-ssp-cyan-500)" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
