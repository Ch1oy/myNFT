/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "dark",
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          primary: "#F4A6C4",  // 轻柔的粉色
          "primary-content": "#9B2C57",  // 深粉色
          secondary: "#FAD0C3",  // 浅桃粉色
          "secondary-content": "#9F1C4D",  // 深桃粉色
          accent: "#FF85B3",  // 浓郁的粉色
          "accent-content": "#FFFFFF",  // 白色
          neutral: "#F8C8D3",  // 浅粉色
          "neutral-content": "#9B2C57",  // 深粉色
          "base-100": "#FFF2F7",  // 背景浅粉色
          "base-200": "#FCE0E8",  // 浅粉色
          "base-300": "#F4A6C4",  // 中度粉色
          "base-content": "#9B2C57",  // 深粉色
          info: "#FF85B3",  // 浓郁的粉色
          success: "#34EEB6",  // 成功绿色
          warning: "#FFCF72",  // 警告黄色
          error: "#FF8863",  // 错误红色

          "--rounded-btn": "9999rem",  // 圆角按钮

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        dark: {
          primary: "#9B2C57",  // 深粉色
          "primary-content": "#F4A6C4",  // 轻柔粉色
          secondary: "#FF85B3",  // 浓郁粉色
          "secondary-content": "#FFFFFF",  // 白色
          accent: "#FAD0C3",  // 浅桃粉色
          "accent-content": "#9F1C4D",  // 深桃粉色
          neutral: "#9B2C57",  // 深粉色
          "neutral-content": "#F4A6C4",  // 轻柔粉色
          "base-100": "#9B2C57",  // 深粉色背景
          "base-200": "#F4A6C4",  // 轻柔粉色
          "base-300": "#FCE0E8",  // 浅粉色
          "base-content": "#F4A6C4",  // 轻柔粉色
          info: "#FF85B3",  // 浓郁的粉色
          success: "#34EEB6",  // 成功绿色
          warning: "#FFCF72",  // 警告黄色
          error: "#FF8863",  // 错误红色

          "--rounded-btn": "9999rem",  // 圆角按钮

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        "space-grotesk": ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
