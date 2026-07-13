/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Typography scale — use these instead of ad-hoc text-2xl/font-black
      // combinations so heading sizes stay consistent across the app.
      //   text-hero    — landing/auth page headlines (48px)
      //   text-page    — page-level h2 (32px)
      //   text-card    — card/section titles (20px)
      //   text-section — subsection labels (16px)
      //   (body text stays the Tailwind default text-sm/text-base — 14px)
      //   text-caption — meta text, timestamps, labels (12px)
      fontSize: {
        hero:    ["3rem",     { lineHeight: "1.1", fontWeight: "900" }],
        page:    ["2rem",     { lineHeight: "1.2", fontWeight: "800" }],
        card:    ["1.25rem",  { lineHeight: "1.3", fontWeight: "700" }],
        section: ["1rem",     { lineHeight: "1.4", fontWeight: "700" }],
        caption: ["0.75rem",  { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
