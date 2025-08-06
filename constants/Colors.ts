// Couleurs de la charte graphique de l'entreprise
const tintColorLight = '#1a396b'; // Bleu foncé principal (mode clair)
const tintColorDark = '#2f929c';  // Vert-bleu principal (mode sombre)
const secondary = '#80a8ba';      // Bleu-gris secondaire

export const Colors = {
  light: {
    text: tintColorLight,
    background: '#ffffff',
    tint: tintColorLight,
    icon: secondary,
    tabIconDefault: '#cccccc',
    tabIconSelected: tintColorLight,
    primary: tintColorLight,
    secondary: secondary,
    border: secondary,
    card: '#f0f6fa',
    surface: '#ffffff',
    error: '#ff4444',
    success: '#4CAF50',
    warning: '#FFC107',
  },
  dark: {
    text: '#ffffff',
    background: '#0f1e2f',
    tint: tintColorDark,
    icon: secondary,
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    primary: tintColorDark,
    secondary: secondary,
    border: secondary,
    card: '#1e3d4f',
    surface: '#1a1a1a',
    error: '#ff6666',
    success: '#66bb6a',
    warning: '#ffca28',
  },
};
