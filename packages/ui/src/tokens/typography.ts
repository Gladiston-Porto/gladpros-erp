/**
 * Design Tokens - Typography
 * GladPros Design System v2.0
 * 
 * Sistema tipográfico com identidade visual da marca
 * - Neuropol: H1 (títulos principais, match com logo)
 * - Roboto: H2-H6 e corpo de texto (legibilidade em tablets)
 * 
 * Base 16px otimizada para tablets (7-10 polegadas)
 */

export const typography = {
  // Font Families
  fontFamily: {
    // Display: Títulos principais (H1) - Identidade da marca
    display: [
      'Neuropol',
      'Impact',
      'Arial Black',
      'sans-serif',
    ].join(', '),
    
    // Heading: Subtítulos (H2-H6)
    heading: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(', '),
    
    // Sans: Corpo de texto
    sans: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(', '),
    
    // Mono: Código (se necessário)
    mono: [
      '"Roboto Mono"',
      '"JetBrains Mono"',
      '"Fira Code"',
      'Consolas',
      '"Courier New"',
      'monospace',
    ].join(', '),
  },
  
  // Font Sizes (Base 16px para tablet)
  // Format: [fontSize, lineHeight]
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],       // 12px/16px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px/20px
    base: ['1rem', { lineHeight: '1.5rem' }],      // 16px/24px ← BASE (tablet)
    lg: ['1.125rem', { lineHeight: '1.75rem' }],   // 18px/28px
    xl: ['1.25rem', { lineHeight: '1.875rem' }],   // 20px/30px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px/32px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px/36px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px/40px
    '5xl': ['3rem', { lineHeight: '3rem' }],       // 48px/48px
    '6xl': ['3.75rem', { lineHeight: '3.75rem' }], // 60px/60px
    '7xl': ['4.5rem', { lineHeight: '4.5rem' }],   // 72px/72px
    '8xl': ['6rem', { lineHeight: '6rem' }],       // 96px/96px
    '9xl': ['8rem', { lineHeight: '8rem' }],       // 128px/128px
  },
  
  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',    // Regular text
    medium: '500',    // Subtle emphasis
    semibold: '600',  // Buttons, labels
    bold: '700',      // Headings
    extrabold: '800',
    black: '900',
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // Line Heights (standalone)
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // Text Transforms
  textTransform: {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    normalCase: 'none',
  },
  
  // Text Decoration
  textDecoration: {
    underline: 'underline',
    overline: 'overline',
    lineThrough: 'line-through',
    none: 'none',
  },
  
  // Heading Styles (pre-configured combinations)
  headings: {
    h1: {
      fontFamily: 'Neuropol, Impact, sans-serif',  // Display font - Identidade da marca
      fontSize: '3rem',        // 48px
      lineHeight: '3rem',      // 48px
      fontWeight: '700',       // bold
      letterSpacing: '0.025em', // Neuropol precisa de espaçamento positivo
    },
    h2: {
      fontFamily: 'Roboto, sans-serif',  // Heading font
      fontSize: '2.25rem',     // 36px
      lineHeight: '2.5rem',    // 40px
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: 'Roboto, sans-serif',  // Heading font
      fontSize: '1.875rem',    // 30px
      lineHeight: '2.25rem',   // 36px
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h4: {
      fontFamily: 'Roboto, sans-serif',  // Heading font
      fontSize: '1.5rem',      // 24px
      lineHeight: '2rem',      // 32px
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h5: {
      fontFamily: 'Roboto, sans-serif',  // Heading font
      fontSize: '1.25rem',     // 20px
      lineHeight: '1.875rem',  // 30px
      fontWeight: '600',
      letterSpacing: '0em',
    },
    h6: {
      fontFamily: 'Roboto, sans-serif',  // Heading font
      fontSize: '1.125rem',    // 18px
      lineHeight: '1.75rem',   // 28px
      fontWeight: '600',
      letterSpacing: '0em',
    },
  },
  
  // Body Text Styles
  body: {
    large: {
      fontSize: '1.125rem',    // 18px
      lineHeight: '1.75rem',   // 28px
      fontWeight: '400',
    },
    base: {
      fontSize: '1rem',        // 16px ← BASE
      lineHeight: '1.5rem',    // 24px
      fontWeight: '400',
    },
    small: {
      fontSize: '0.875rem',    // 14px
      lineHeight: '1.25rem',   // 20px
      fontWeight: '400',
    },
    tiny: {
      fontSize: '0.75rem',     // 12px
      lineHeight: '1rem',      // 16px
      fontWeight: '400',
    },
  },
  
  // Label Styles (forms, buttons)
  label: {
    large: {
      fontSize: '1rem',        // 16px
      lineHeight: '1.5rem',
      fontWeight: '500',
    },
    base: {
      fontSize: '0.875rem',    // 14px
      lineHeight: '1.25rem',
      fontWeight: '500',
    },
    small: {
      fontSize: '0.75rem',     // 12px
      lineHeight: '1rem',
      fontWeight: '500',
    },
  },
} as const;

export type TypographyToken = typeof typography;

// Helper types
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type HeadingLevel = keyof typeof typography.headings;
export type BodyStyle = keyof typeof typography.body;
