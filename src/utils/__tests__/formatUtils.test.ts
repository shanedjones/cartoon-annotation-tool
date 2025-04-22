import { formatTime, formatFileSize, formatDuration, formatTimestamp } from '../formatUtils';

describe('formatUtils', () => {
  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle invalid inputs', () => {
      expect(formatTime(-1)).toBe('0:00');
      expect(formatTime(NaN)).toBe('0:00');
      // @ts-ignore - Testing null case
      expect(formatTime(null)).toBe('0:00');
      // @ts-ignore - Testing undefined case
      expect(formatTime(undefined)).toBe('0:00');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes to human-readable size', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle invalid inputs', () => {
      expect(formatFileSize(-1)).toBe('0 Bytes');
      expect(formatFileSize(NaN)).toBe('0 Bytes');
      // @ts-ignore - Testing null case
      expect(formatFileSize(null)).toBe('0 Bytes');
      // @ts-ignore - Testing undefined case
      expect(formatFileSize(undefined)).toBe('0 Bytes');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00:00');
      expect(formatDuration(30)).toBe('00:00:30');
      expect(formatDuration(60)).toBe('00:01:00');
      expect(formatDuration(3600)).toBe('01:00:00');
      expect(formatDuration(3661)).toBe('01:01:01');
      expect(formatDuration(86399)).toBe('23:59:59');
    });

    it('should handle invalid inputs', () => {
      expect(formatDuration(-1)).toBe('00:00:00');
      expect(formatDuration(NaN)).toBe('00:00:00');
      // @ts-ignore - Testing null case
      expect(formatDuration(null)).toBe('00:00:00');
      // @ts-ignore - Testing undefined case
      expect(formatDuration(undefined)).toBe('00:00:00');
    });
  });

  describe('formatTimestamp', () => {
    beforeEach(() => {
      // Mock Date constructor to return a fixed date
      const mockDate = new Date('2023-01-01T12:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      (global.Date as any).toLocaleDateString = jest.fn(() => '1/1/2023');
      (global.Date as any).toLocaleTimeString = jest.fn(() => '12:00:00 PM');
    });

    afterEach(() => {
      // Restore the original Date
      (global.Date as any).mockRestore();
    });

    it('should format ISO string to readable date', () => {
      // Since we've mocked the Date methods, we can test the functionality
      expect(formatTimestamp('2023-01-01T12:00:00Z')).toBe('1/1/2023 12:00:00 PM');
    });

    it('should handle invalid date strings', () => {
      expect(formatTimestamp('invalid-date')).toBe('Invalid date');
      expect(formatTimestamp('')).toBe('Invalid date');
      // @ts-ignore - Testing null case
      expect(formatTimestamp(null)).toBe('Invalid date');
      // @ts-ignore - Testing undefined case
      expect(formatTimestamp(undefined)).toBe('Invalid date');
    });
  });
});