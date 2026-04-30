import type { Preview } from "@storybook/react-vite";
import { ThemeProvider, type ThemeMode } from "../src/renderer/src/lib/theme";
import { LocaleProvider, type Locale } from "../src/renderer/src/lib/i18n";
import "../src/renderer/src/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Color scheme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "system", title: "System" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Translation language",
      defaultValue: "en",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "es", title: "Español" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme as ThemeMode;
      const locale = ctx.globals.locale as Locale;
      // Re-mounting providers when toolbar values change is the cleanest
      // way to thread initial values without coupling Story components
      // to the toolbar API.
      const providerKey = `${theme}::${locale}`;
      return (
        <ThemeProvider key={providerKey} initial={theme}>
          <LocaleProvider initial={locale}>
            <div className="bg-background text-foreground min-h-screen p-8 antialiased">
              <Story />
            </div>
          </LocaleProvider>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
