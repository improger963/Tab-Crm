import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { POPOVER_PANEL } from '../lib/motionPresets';

/* ─────────────────────────────────────────────────────────────────────────
   SelectField — the app-wide replacement for native <select> chrome.
   Visually mirrors .input-field / .btn (same radius, padding, focus ring),
   opens with the shared POPOVER_PANEL motion preset, and keeps 100% of the
   option markup the caller already wrote: children are plain <option>
   elements, parsed for value/label, so no behavior or copy is rewritten.
   ───────────────────────────────────────────────────────────────────────── */

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  children: React.ReactNode;
  /** Accepted for call-site compatibility with the old native markup; not used. */
  name?: string;
  /** 'md' mirrors .select-field, 'sm' mirrors .select-field-sm, 'bare' is for inline pill toolbars. */
  size?: 'md' | 'sm' | 'bare';
  /** Anchor edge of the floating panel. */
  align?: 'left' | 'right';
  /** Extra classes for the trigger (e.g. font-mono, w-auto). */
  className?: string;
}

/** Flattens string/number children (incl. interpolated JSX arrays) back to text. */
const textOf = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((k) => (typeof k === 'string' || typeof k === 'number' ? String(k) : ''))
    .join('');

const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  'aria-label': ariaLabel,
  children,
  size = 'md',
  align = 'left',
  className = '',
}) => {
  const [open, setActive] = useState(false);
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) =>
    setActive((prev) => (typeof next === 'function' ? next(prev) : next));
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Derive options straight from the <option> children the caller passed in.
  const options: SelectOption[] = useMemo(
    () =>
      React.Children.toArray(children)
        .filter((child): child is React.ReactElement => React.isValidElement(child))
        .map((child) => ({
          value: String(child.props.value ?? textOf(child.props.children)),
          label: textOf(child.props.children),
        })),
    [children]
  );

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selectedLabel = options[selectedIndex]?.label ?? '';

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keyboard index tracks the real selection whenever the panel opens.
  useEffect(() => {
    if (open) {
      setActiveIdx(selectedIndex);
      listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, selectedIndex]);

  const commit = (idx: number) => {
    const opt = options[idx];
    if (opt) onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); break; }
        setActiveIdx((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) { setOpen(true); break; }
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open) { e.preventDefault(); setActiveIdx(0); }
        break;
      case 'End':
        if (open) { e.preventDefault(); setActiveIdx(options.length - 1); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) commit(activeIdx);
        else setOpen(true);
        break;
      case 'Escape':
        if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const triggerBase =
    'flex items-center justify-between gap-2 text-left w-full cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/35';
  const triggerSizeCls =
    size === 'md'
      ? 'select-field !bg-none !pr-2.5'
      : size === 'sm'
        ? 'select-field select-field-sm !bg-none !pr-2'
        : 'rounded-md text-xs font-semibold text-slate-800 px-1 py-0.5 hover:bg-slate-100/80 dark:hover:bg-slate-700/40 focus:ring-primary/40';

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`${triggerBase} ${triggerSizeCls}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-55 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            {...POPOVER_PANEL}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            className={`absolute z-50 mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} origin-top min-w-full w-max max-w-[min(24rem,calc(100vw-2rem))] max-h-72 overflow-y-auto custom-scrollbar bg-surface border border-slate-200/90 dark:border-slate-700 rounded-lg shadow-popover py-1`}
          >
            {options.map((opt, idx) => {
              const isSel = idx === selectedIndex;
              const isActive = idx === activeIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSel}
                  data-selected={isSel ? 'true' : undefined}
                  onClick={() => commit(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`flex items-center justify-between gap-3 mx-1 rounded-md cursor-pointer select-none ${
                    size === 'md' ? 'px-2.5 py-2 text-sm' : 'px-2 py-1.5 text-xs'
                  } font-medium ${
                    isSel
                      ? 'bg-indigo-50/70 dark:bg-indigo-500/15 text-primary-ink dark:text-indigo-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200'
                  } ${isActive && !isSel ? 'bg-slate-100/80 dark:bg-slate-700/50' : ''}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSel && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectField;
