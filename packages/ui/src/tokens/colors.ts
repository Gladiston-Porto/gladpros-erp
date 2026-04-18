
export const colors = {
  // Marca Primária - Mapeado para --color-brand-primary
  primary: '#0098DA',      // Azul GladPros
  primaryLight: '#4AC4F5',  // Azul Claro
  primaryDark: '#00569E',   // Azul Escuro

  // Marca Secundária - Mapeado para --color-brand-secondary
  secondary: '#FF8C00',     // Laranja
  secondaryLight: '#FFB84D', // Laranja Claro
  secondaryDark: '#E67300', // Laranja Escuro

  // Neutros
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Semânticas
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Soft Badge Colors — pastel bg + dark text (professional look)
  soft: {
    blue:    { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', darkBg: 'rgba(59,130,246,0.15)', darkText: '#93C5FD' },
    green:   { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', darkBg: 'rgba(34,197,94,0.15)',  darkText: '#86EFAC' },
    red:     { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', darkBg: 'rgba(239,68,68,0.15)',  darkText: '#FCA5A5' },
    yellow:  { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', darkBg: 'rgba(245,158,11,0.15)', darkText: '#FCD34D' },
    orange:  { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA', darkBg: 'rgba(249,115,22,0.15)', darkText: '#FDBA74' },
    purple:  { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF', darkBg: 'rgba(168,85,247,0.15)', darkText: '#C4B5FD' },
    gray:    { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB', darkBg: 'rgba(107,114,128,0.15)',darkText: '#D1D5DB' },
    cyan:    { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC', darkBg: 'rgba(6,182,212,0.15)',  darkText: '#67E8F9' },
  },

  // Gradientes
  gradient: {
    hero: 'linear-gradient(135deg, #0098DA 0%, #006899 100%)',
    heroDark: 'linear-gradient(135deg, #006899 0%, #003D5C 100%)',
    primary: 'linear-gradient(135deg, #4AC4F5 0%, #00569E 100%)',
    subtle: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
    subtleDark: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    sidebar: 'linear-gradient(180deg, #0098DA 0%, #00569E 50%, #003D5C 100%)',
  }
} as const;
