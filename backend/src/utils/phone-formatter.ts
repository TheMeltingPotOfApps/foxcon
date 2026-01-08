export class PhoneFormatter {
  /**
   * Format phone number to E.164 format
   * @param phoneNumber - Phone number in any format
   * @returns E.164 formatted number (e.g., +17065551234)
   */
  static formatToE164(phoneNumber: string | number): string {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters
    let cleaned = String(phoneNumber).replace(/\D/g, '');

    // 11 digits starting with 1: add + prefix
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }

    // 10 digits: add +1 prefix
    if (cleaned.length === 10) {
      return '+1' + cleaned;
    }

    // Invalid: throw error
    if (cleaned.length < 10) {
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    // If already has country code, add + prefix
    return '+' + cleaned;
  }

  /**
   * Format phone number without +1 prefix (for Asterisk compatibility)
   * Always outputs with leading "1" (no "+" sign)
   * @param phoneNumber - Phone number in any format
   * @returns Formatted number with leading "1" (e.g., 17065551234)
   */
  static formatWithoutPlusOne(phoneNumber: string | number): string {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters (including + sign)
    let cleaned = String(phoneNumber).replace(/\D/g, '');

    // Invalid: throw error if too short
    if (cleaned.length < 10) {
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    // 11 digits starting with 1: return as-is (17065551234)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned;
    }

    // 10 digits: add "1" prefix (7065551234 -> 17065551234)
    if (cleaned.length === 10) {
      return '1' + cleaned;
    }

    // If longer than 11 digits and starts with 1, return first 11 digits
    if (cleaned.length > 11 && cleaned.startsWith('1')) {
      return cleaned.substring(0, 11);
    }

    // If 11 digits but doesn't start with 1, prepend "1"
    if (cleaned.length === 11 && !cleaned.startsWith('1')) {
      return '1' + cleaned;
    }

    // For other lengths, try to extract 10-digit number and add "1"
    if (cleaned.length > 10) {
      // Try to find a 10-digit sequence
      const last10 = cleaned.substring(cleaned.length - 10);
      return '1' + last10;
    }

    // Fallback: add "1" prefix
    return '1' + cleaned;
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns true if valid, false otherwise
   */
  static isValid(phoneNumber: string | number): boolean {
    try {
      this.formatToE164(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }
}

