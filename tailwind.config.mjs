import defaultTheme from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,mjs,ts,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        overlay: "var(--surface-strong)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          strong: "var(--accent-strong)"
        },
        text: {
          primary: "var(--text-1)",
          secondary: "var(--text-2)",
          muted: "var(--muted)",
          inverted: "var(--text-inverted)"
        },
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono]
      },
      fontSize: {
        xs: ["clamp(0.78rem, 0.74rem + 0.12vw, 0.84rem)", { lineHeight: "1.6" }],
        sm: ["clamp(0.86rem, 0.8rem + 0.16vw, 0.94rem)", { lineHeight: "1.6" }],
        base: ["clamp(1rem, 0.94rem + 0.2vw, 1.08rem)", { lineHeight: "1.7" }],
        lg: ["clamp(1.125rem, 1.05rem + 0.25vw, 1.25rem)", { lineHeight: "1.55" }],
        xl: ["clamp(1.35rem, 1.2rem + 0.35vw, 1.6rem)", { lineHeight: "1.45" }],
        "2xl": ["clamp(1.6rem, 1.35rem + 0.6vw, 2rem)", { lineHeight: "1.35" }],
        "3xl": ["clamp(1.9rem, 1.55rem + 0.9vw, 2.5rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(2.25rem, 1.8rem + 1.2vw, 3.1rem)", { lineHeight: "1.1" }],
        "5xl": ["clamp(2.6rem, 2rem + 1.6vw, 3.75rem)", { lineHeight: "1.05" }]
      },
      boxShadow: {
        soft: "0 10px 40px -20px rgb(15 23 42 / 0.25)",
        ring: "inset 0 0 0 1px rgb(148 163 184 / 0.15)",
        overlay: "0 20px 60px -30px rgb(15 23 42 / 0.45)"
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "9999px"
      },
      spacing: {
        gutter: "clamp(1.25rem, 0.85rem + 1.2vw, 2.75rem)"
      },
      maxWidth: {
        prose: "65ch"
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme("colors.text.primary"),
            a: {
              color: theme("colors.accent.DEFAULT"),
              fontWeight: 600,
              textDecoration: "none",
              borderBottom: `1px solid ${theme("colors.accent.soft")}`,
              transition: "color 200ms ease, border 200ms ease",
              '&:hover': {
                color: theme("colors.accent.strong"),
                borderBottomColor: theme("colors.accent.strong")
              }
            },
            strong: { color: theme("colors.text.primary") },
            blockquote: {
              fontStyle: "normal",
              borderLeftColor: theme("colors.accent.soft"),
              color: theme("colors.text.secondary")
            },
            code: {
              fontFamily: theme("fontFamily.mono").join(", "),
              backgroundColor: theme("colors.surface"),
              padding: "0.125em 0.375em",
              borderRadius: theme("borderRadius.lg")
            }
          }
        },
        invert: {
          css: {
            color: theme("colors.text.inverted"),
            a: {
              color: theme("colors.accent.soft"),
              borderBottomColor: theme("colors.accent.soft"),
              '&:hover': {
                color: theme("colors.accent.DEFAULT"),
                borderBottomColor: theme("colors.accent.DEFAULT")
              }
            },
            blockquote: {
              borderLeftColor: theme("colors.accent.DEFAULT"),
              color: theme("colors.text.muted")
            }
          }
        }
      }),
      container: {
        center: true,
        padding: {
          DEFAULT: "clamp(1.25rem, 1rem + 1vw, 3rem)",
          lg: "clamp(2rem, 1.5rem + 1vw, 4rem)"
        },
        screens: {
          "2xl": "1200px"
        }
      }
    }
  },
  plugins: [typography]
};
