import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        ok: "hsl(var(--ok))",
        warn: "hsl(var(--warn))",
        bad: "hsl(var(--bad))",
        gold: { DEFAULT: "#e0c25a", soft: "#c9a227" },

        // ---- Beige + Espresso (warm two-tone) palette --------------------------
        surface: "#e8e0cf", // beige canvas
        "on-surface": "#281c15", // espresso (text + 2px borders)
        "on-surface-variant": "#6b584a", // muted brown
        "surface-variant": "#d8cdb6",
        "surface-container-lowest": "#fbf8f1", // cream cards
        "surface-container-low": "#f3eddf", // table headers
        "surface-container": "#ece4d2",
        "surface-container-high": "#e3dac4",
        "surface-container-highest": "#dacfb8",
        outline: "#8a7867",
        "outline-variant": "#cbbda4", // light brown dividers
        success: "#281c15",
        warning: "#6b584a",
        danger: "#9a3412", // burnt rust
        "status-completed": "#281c15",
        "status-pending": "#c9bca6",
        "status-late": "#9a3412",
        "status-progress": "#281c15",
        "primary-container": "#281c15", // accent = espresso
        "on-primary-container": "#e8e0cf",
        "accent-neutral": "#c9bca6",
        "primary-fixed": "#e3dac4",
        "primary-fixed-variant": "#281c15",
        "on-primary": "#fbf8f1", // cream text on espresso
        error: "#9a3412",
        "on-error": "#fbf8f1",
        "error-container": "#f0d9cc",
        "glass-bg": "#e8e0cf",
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "800" }],
        "headline-xl": ["44px", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-sm": ["18px", { lineHeight: "1.35", fontWeight: "600" }],
        "headline-lg-mobile": ["26px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.45", fontWeight: "400" }],
        "data-mono": ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Geist", "Inter", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glass: "0 10px 30px -12px rgba(30, 64, 175, 0.22), 0 2px 6px -2px rgba(15, 23, 42, 0.06)",
        glow: "0 0 22px -6px rgba(37, 99, 235, 0.5)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.35s ease-out both",
      },
    },
  },
  plugins: [animate],
};
