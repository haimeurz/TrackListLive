/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          purple: {
            deep: '#0A0510',
            dark: '#1A0C2E',
            DEFAULT: '#2A1B3D',
            light: '#9B7BF7',
            neon: '#8B5CF6',
            glow: '#C084FC'
          },
          pink: {
            DEFAULT: '#EC4899',
            light: '#F472B6',
            neon: '#FF1493',
            glow: '#FF69B4'
          },
          black: '#000000'
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-purple-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-pink': '0 0 20px rgba(255, 20, 147, 0.5)',
        'glow-pink-sm': '0 0 10px rgba(255, 20, 147, 0.3)',
      },
      textShadow: {
        'glow-pink': '0 0 8px rgba(255, 20, 147, 0.7)',
        'glow-purple': '0 0 8px rgba(139, 92, 246, 0.7)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
