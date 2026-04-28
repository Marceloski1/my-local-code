/**
 * Paleta de colores de LocalCode
 * Usar estrictamente estos colores en toda la TUI
 */
export const COLORS = {
  // Acentos
  PRIMARY: '#E53935', // Rojo - Acento primario
  SECONDARY: '#1E88E5', // Azul - Acento secundario
  ACCENT: '#42A5F5', // Azul brillante - Selección / activo / código inline
  ACTIVE: '#42A5F5', // Azul brillante - Selección / activo (alias de ACCENT)

  // Superficie y UI
  SURFACE: '#2A2D36', // Gris oscuro - Superficie / UI chrome
  BACKGROUND: '#0D0D0D', // Negro - Fondo

  // Texto
  TEXT_PRIMARY: '#F0F0F0', // Blanco - Texto primario
  TEXT_SECONDARY: '#8B8FA8', // Gris claro - Texto secundario

  // Estados
  WARNING: '#FFB300', // Amarillo dorado - Warning / thinking
  SUCCESS: '#66BB6A', // Verde - Éxito / sección header
} as const;

/**
 * Mapeo de colores de Ink a la paleta de LocalCode
 * Ink soporta colores básicos y hex
 */
export const INK_COLORS = {
  // Acentos
  primary: COLORS.PRIMARY,
  secondary: COLORS.SECONDARY,
  accent: COLORS.ACCENT,
  active: COLORS.ACTIVE,

  // Texto
  text: COLORS.TEXT_PRIMARY,
  textSecondary: COLORS.TEXT_SECONDARY,

  // Estados
  warning: COLORS.WARNING,
  success: COLORS.SUCCESS,
  error: COLORS.PRIMARY, // Usar rojo primario para errores

  // UI
  border: COLORS.TEXT_SECONDARY,
  surface: COLORS.SURFACE,
} as const;
