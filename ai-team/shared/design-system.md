# SynthMR — Design System

## Layout Patterns

- **Max width**: Content constrained by `.container-app` class (centered, padded).
- **Page structure**: Sticky header (z-40) → main content with `py-8` padding → footer with border-top.
- **Responsive**: Mobile-first. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). Nav items collapse on small screens.
- **Print**: Header and footer hidden via `.no-print` class.

## Component Structure

- **Base UI components** live in `src/components/ui/`: Button, Card, Dialog, Input, Select, Badge, Label, Textarea, Separator, ScrollArea, Dropdown, Loading, Error.
- **Feature components** live in `src/components/` organized by domain: `auth/`, `account/`, `agents/`, `docs/`.
- Components use `clsx` and `tailwind-merge` for conditional class composition.
- Prefer composition over prop drilling. Use `children` patterns for flexible layouts.
- Client components (`"use client"`) should be as small as possible. Keep data fetching in server components.

## Typography

- **Font**: Inter (loaded via `next/font/google`, variable `--font-sans`).
- **Headings**: Use semantic HTML (`h1`–`h4`). Style with Tailwind (`text-2xl font-bold`, `text-lg font-semibold`).
- **Body text**: `text-sm` or `text-base` depending on context. Use `text-slate-600 dark:text-slate-400` for secondary text.
- **Monospace**: Not currently used. If needed, use `font-mono`.

## Color Palette

- **Primary surface**: White (`bg-white`) / Dark (`bg-slate-900`).
- **Text primary**: `text-slate-900` / `dark:text-slate-50`.
- **Text secondary**: `text-slate-600` / `dark:text-slate-400`.
- **Text muted**: `text-slate-500` / `dark:text-slate-400`.
- **Borders**: `border-slate-200` / `dark:border-slate-800`.
- **Accent/Interactive**: Blue (`bg-blue-600 text-white`, `hover:bg-blue-700`).
- **Destructive**: Red (`bg-red-600 text-white`).
- **Success**: Green tones for positive indicators.
- **Background subtle**: `bg-slate-50` / `dark:bg-slate-800/50`.

## Spacing Rules

- Use Tailwind spacing scale consistently: `gap-1` (4px), `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).
- Page padding: `py-8` on main content area.
- Card padding: `p-4` or `p-6` depending on density.
- Form spacing: `space-y-4` between form groups, `space-y-2` within a group (label + input).
- Button spacing in groups: `gap-2`.

## Dark Mode

- Implemented via `next-themes` with `class` strategy.
- Toggle component: `ThemeToggle` in header.
- All components must support dark mode. Use `dark:` prefix on all color classes.
- Background uses CSS variables: `rgb(var(--background))` / `rgb(var(--foreground))`.

## Shadows

- `shadow-soft`: Subtle elevation for cards (light).
- `shadow-card`: Slightly stronger card elevation.
- `border-radius`: `rounded-lg` default, `rounded-2xl` (1rem) for large cards.

## Accessibility Expectations

- All interactive elements must be keyboard-accessible.
- Use semantic HTML elements (`button`, `a`, `input`, `label`).
- Associate labels with inputs via `htmlFor` / `id`.
- Provide sufficient color contrast (WCAG AA minimum).
- Use `aria-label` on icon-only buttons.
- Focus states must be visible (Tailwind `focus:ring-2 focus:ring-blue-500`).
- Toast notifications (Sonner) include close buttons.

## UX Consistency Rules

- **Loading states**: Use `Skeleton` component for content loading, `Loading` spinner for actions.
- **Empty states**: Use `EmptyState` component with icon, title, description, and optional CTA.
- **Error states**: Use `Error` component. Show user-friendly messages, never raw error objects.
- **Toasts**: Use Sonner. Position: top-right. Use `richColors` for semantic coloring. Include close button.
- **Confirmations**: Use `Dialog` component for destructive actions (delete study, delete account).
- **Progress**: Use `ProgressStepper` for multi-phase operations (study runs).
- **Navigation**: Breadcrumbs on nested pages. Active nav state in header.

## Charts and Data Visualization

- **Library**: Recharts.
- Use consistent color schemes across charts.
- Include tooltips on all chart elements.
- Responsive: charts should resize with container.
- Label axes clearly. Include legends when multiple series present.

## Animation

- **Library**: Framer Motion.
- Use subtle animations for page transitions and element reveals.
- Keep durations short (150–300ms).
- Respect `prefers-reduced-motion`.
