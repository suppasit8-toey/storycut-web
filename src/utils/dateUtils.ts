// Global date formatting utilities for DD/MM/YYYY format

/**
 * Convert Date object or date string to DD/MM/YYYY string
 * Handles both Date objects and various string formats (M/D/YYYY, D/M/YYYY)
 * @param date - Date object or date string to format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateDDMMYYYY = (date: Date | string): string => {
    try {
        // Handle Date objects
        if (date instanceof Date) {
            if (isNaN(date.getTime())) {
                console.error('Invalid Date object');
                return '';
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        // Handle string inputs
        if (typeof date === 'string') {
            // If already in DD/MM/YYYY format, return as is
            if (isDDMMYYYY(date)) {
                return date;
            }

            // Try to parse M/D/YYYY format
            const parts = date.split('/');
            if (parts.length === 3) {
                let [part1, part2, year] = parts.map(p => parseInt(p, 10));

                // Determine which format it is
                // If first part > 12, it must be day (DD/MM/YYYY)
                // If second part > 12, it must be day, so swap (MM/DD/YYYY -> DD/MM/YYYY)
                let day: number, month: number;

                if (part1 > 12) {
                    // Already DD/MM/YYYY
                    day = part1;
                    month = part2;
                } else if (part2 > 12) {
                    // MM/DD/YYYY, need to swap
                    day = part2;
                    month = part1;
                } else {
                    // Ambiguous case (both <= 12), assume MM/DD/YYYY (US format) and convert
                    day = part2;
                    month = part1;
                }

                // Validate the date is reasonable
                if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
                    console.error('Invalid date values:', { day, month, year });
                    return '';
                }

                return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            }
        }

        console.error('Unsupported date format:', date);
        return '';
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

/**
 * Parse DD/MM/YYYY string to Date object
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object
 */
export const parseDDMMYYYY = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Check if date string is in DD/MM/YYYY format
 * @param dateStr - Date string to check
 * @returns true if format is DD/MM/YYYY
 */
export const isDDMMYYYY = (dateStr: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;

    // Validate the date is actually valid
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
};

/**
 * Convert M/D/YYYY to DD/MM/YYYY (for handling legacy data)
 * @param dateStr - Date string in M/D/YYYY format
 * @returns Date string in DD/MM/YYYY format
 */
export const convertMDYYYYtoDDMMYYYY = (dateStr: string): string => {
    const [month, day, year] = dateStr.split('/').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

/**
 * Normalize date string to DD/MM/YYYY format (handles both formats)
 * @param dateStr - Date string in either M/D/YYYY or DD/MM/YYYY format
 * @returns Date string in DD/MM/YYYY format
 */
export const normalizeDateString = (dateStr: string): string => {
    if (isDDMMYYYY(dateStr)) {
        return dateStr;
    }
    // Assume M/D/YYYY format and convert
    return convertMDYYYYtoDDMMYYYY(dateStr);
};
