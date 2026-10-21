/** @type {import('tailwindcss').Config} */

// Every color is an RGB channel triplet defined in src/index.css, so opacity
// modifiers like `bg-accent/20` keep working. Values come from docs/design-spec.md §3.
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`

const emotions = ['calm', 'lucid', 'longing', 'joy', 'fear', 'unease', 'sadness', 'neutral']

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Colors, type sizes and radii replace Tailwind's defaults on purpose:
    // only design-spec tokens exist, so nothing off-palette can sneak in.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: channel('bg'),
      raised: channel('bg-raised'),
      glass: 'rgb(var(--glass) / 0.06)',
      hairline: 'rgb(var(--glass) / 0.10)',
      fg: {
        DEFAULT: channel('text-primary'),
        secondary: channel('text-secondary'),
        muted: channel('text-muted'),
      },
      accent: {
        DEFAULT: channel('accent'),
        soft: channel('accent-soft'),
      },
      ember: channel('ember'),
      emotion: Object.fromEntries(emotions.map((e) => [e, channel(`emo-${e}-edge`)])),
    },
    fontFamily: {
      serif: ['"Instrument Serif"', '"Noto Serif SC"', 'serif'],
      sans: ['Geist', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      mono: ['"Geist Mono"', '"Noto Sans SC"', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      display: ['3.5rem', { lineHeight: '1', fontWeight: '400' }],
      title: ['2rem', { lineHeight: '1.15', fontWeight: '400' }],
      dream: ['1.25rem', { lineHeight: '1.75' }],
      body: ['1rem', { lineHeight: '1.6' }],
      label: ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
      meta: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
    },
    borderRadius: {
      none: '0',
      image: '12px',
      card: '24px',
      glass: '28px',
      pill: '999px',
    },
    extend: {
      // Spacing uses Tailwind's default 4px scale, which already matches the
      // spec's 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 steps.
      maxWidth: {
        reading: '36rem',
      },
      backdropBlur: {
        glass: '24px',
      },
      backgroundImage: {
        grain: 'var(--grain-image)',
        night: 'linear-gradient(to bottom, rgb(var(--accent) / 0.18) 0%, rgb(var(--bg) / 0) 60%)',
      },
      boxShadow: {
        glow: '0 0 32px rgb(var(--accent) / 0.45)',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
        dream: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        DEFAULT: '400ms',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        shimmer: {
          to: { transform: 'rotate(360deg)' },
        },
        enter: {
          from: { opacity: '0', transform: 'translateY(8px)', filter: 'blur(8px)' },
          to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
      },
      animation: {
        breathe: 'breathe 6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        pulse: 'pulse 1.2s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        shimmer: 'shimmer 8s linear infinite',
        enter: 'enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
