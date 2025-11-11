/**
 * Timezone utilities for Jakarta timezone handling
 */

export const JAKARTA_TIMEZONE = 'Asia/Jakarta';

/**
 * Get current date and time in Jakarta timezone
 */
export const getJakartaTime = (): Date => {
  return new Date().toLocaleString("en-US", { timeZone: JAKARTA_TIMEZONE }) as any;
};

/**
 * Convert UTC date to Jakarta timezone
 */
export const convertToJakarta = (utcDate: Date): Date => {
  return new Date(utcDate.toLocaleString("en-US", { timeZone: JAKARTA_TIMEZONE }));
};

/**
 * Format date in Jakarta timezone
 */
export const formatJakartaTime = (
  date: Date, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
): string => {
  return date.toLocaleString('id-ID', { 
    ...options, 
    timeZone: JAKARTA_TIMEZONE 
  });
};

/**
 * Get Jakarta time as ISO string
 */
export const getJakartaTimeISO = (): string => {
  const now = new Date();
  const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: JAKARTA_TIMEZONE }));
  return jakartaTime.toISOString();
};

/**
 * Parse date string and ensure it's in Jakarta timezone
 */
export const parseJakartaTime = (dateString: string): Date => {
  const date = new Date(dateString);
  return convertToJakarta(date);
};
