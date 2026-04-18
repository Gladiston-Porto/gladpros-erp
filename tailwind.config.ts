
import type { Config } from "tailwindcss";
import { colors } from "./packages/ui/src/tokens/colors";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",

                // Brand Colors (mapped to tokens)
                primary: {
                    DEFAULT: colors.primary,
                    light: colors.primaryLight,
                    dark: colors.primaryDark,
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: colors.secondary,
                    light: colors.secondaryLight,
                    dark: colors.secondaryDark,
                    foreground: "#ffffff",
                },

                // Semantics
                success: colors.success,
                warning: colors.warning,
                error: colors.error,
                info: colors.info,

                // Neutrals
                neutral: colors.neutral,
            },
            fontFamily: {
                display: ["var(--font-display)", "sans-serif"], // Neuropol
                sans: ["var(--font-heading)", "var(--font-sans)", "sans-serif"], // Roboto
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '30': '7.5rem',
            },
            backgroundImage: {
                'hero-gradient': colors.gradient.hero,
                'hero-gradient-dark': colors.gradient.heroDark,
                'sidebar-gradient': colors.gradient.sidebar,
            },
            boxShadow: {
                'card': '0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.06)',
                'card-hover': '0 4px 12px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.04)',
                'elevated': '0 8px 30px rgb(0 0 0 / 0.08), 0 2px 8px rgb(0 0 0 / 0.04)',
                'glow-blue': '0 0 20px -5px rgba(0, 152, 218, 0.3)',
                'glow-orange': '0 0 20px -5px rgba(255, 140, 0, 0.3)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
            },
            keyframes: {
                'slide-up-fade': {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
            },
            animation: {
                'slide-up-fade': 'slide-up-fade 0.3s ease-out',
                'scale-in': 'scale-in 0.2s ease-out',
                'shimmer': 'shimmer 2s infinite',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
export default config;
