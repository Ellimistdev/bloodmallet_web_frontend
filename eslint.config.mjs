import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: [
      // All .js files,
      // "**/*.js" 
      // App-specific JS files
      // "general_website/static/general_website/js/*.js",
      "general_website/static/general_website/js/bm-charts.js",
      "general_website/static/general_website/js/navbar_trinket_menu.js",
    ],
    languageOptions: {
      sourceType: "script", // For browser scripts, not ES modules
      globals: {
        ...globals.browser,
        // Add your Django/project specific globals
        $: "readonly",
        jQuery: "readonly", 
        $WowheadPower: "readonly",
        bloodmallet_chart_import: "readonly",
        bm_import_charts: "readonly",
        BmUIUtils: "readonly",
        BmChartComponents: "readonly",
        BmChartData: "readonly",
        BmBarChart: "readonly",
        BmRadarChart: "readonly",
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      // Enforce single quotes
      "quotes": ["warn", "single", { "allowTemplateLiterals": true }],
      // Enforce semicolons
      "semi": ["warn", "always"],
      // Other helpful rules
      "no-unused-vars": ["warn", { "args": "none" }],
      "no-console": "off", // Allow console.log for debugging
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },
  {
    // Ignore certain files/directories
    ignores: [
      "env/**",             // Python virtual environment
      "venv/**",            // Alternative venv name
      ".venv/**",           // Alternative venv name
      "node_modules/**",    // Node modules
      "**/CACHE/**",        // Django compressor cache
      "**/migrations/**",   // Django migrations
      "**/static/admin/**", // Django admin static files
      "**/*.min.js",        // Minified files
    ]
  }
];