// src/theme/index.ts
export const lightTheme = {
  colors: {
    background: '#ffffffff',
    text: '#000000ff',        // ← Farbe der inaktiven Icons
    primary: '#3f15b3ff',
    card: '#F5F5F5',
    tabbar: '#151515ff',
    border: '#E5E5EA',
    muted: '#9CA3AF',         // ← Farbe der inaktiven Labels
    // Button-spezifische Farben
    button: {
      primary: {
        background: '#3838acff',
        text: '#FFFFFF',
        border: '#6750A4',
      },
      secondary: {
        background: 'transparent',
        text: '#6750A4',
        border: '#6750A4',
      },
      danger: {
        background: '#DC2626',
        text: '#FFFFFF',
        border: '#DC2626',
      },
      outline: {
        background: 'transparent',
        text: '#6750A4',
        border: '#6750A4',
      },
    },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
  typography: {
    h1: 32,
    h2: 24,
    body: 16,
    small: 14,
  },
  // Komponenten-spezifische Stile
  components: {
    button: {
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '600',
    },
    card: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
    },
  },
};

export const darkTheme: typeof lightTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: '#0B0B0F',
    text: '#ffffffff',        // ← Farbe der inaktiven Icons (Dark Mode)
    card: '#151518',
    border: '#2A2A2E',
    muted: '#9CA3AF',         // ← Farbe der inaktiven Labels (Dark Mode)
    // Button-Farben für Dark Theme anpassen
    button: {
      primary: {
        background: '#8B7ED8',
        text: '#FFFFFF',
        border: '#8B7ED8',
      },
      secondary: {
        background: 'transparent',
        text: '#8B7ED8',
        border: '#8B7ED8',
      },
      danger: {
        background: '#EF4444',
        text: '#FFFFFF',
        border: '#EF4444',
      },
      outline: {
        background: 'transparent',
        text: '#8B7ED8',
        border: '#8B7ED8',
      },
    },
  },
};

export type AppTheme = typeof lightTheme;
