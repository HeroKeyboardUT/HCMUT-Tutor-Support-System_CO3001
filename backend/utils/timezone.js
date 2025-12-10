/**
 * Timezone utilities for Vietnam (UTC+7)
 */

const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_OFFSET_HOURS = 7;
const VIETNAM_OFFSET_MS = VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Get current time in Vietnam timezone
 * @returns {Date} Current date/time adjusted to Vietnam timezone
 */
const getVietnamNow = () => {
  const now = new Date();
  return new Date(now.getTime() + VIETNAM_OFFSET_MS);
};

/**
 * Get start of today in Vietnam timezone (00:00:00)
 * @returns {Date} Start of today in Vietnam timezone
 */
const getVietnamTodayStart = () => {
  const vietnamNow = getVietnamNow();
  const dateStr = vietnamNow.toISOString().split("T")[0];
  return new Date(dateStr + "T00:00:00.000Z");
};

/**
 * Get end of today in Vietnam timezone (23:59:59)
 * @returns {Date} End of today in Vietnam timezone
 */
const getVietnamTodayEnd = () => {
  const vietnamNow = getVietnamNow();
  const dateStr = vietnamNow.toISOString().split("T")[0];
  return new Date(dateStr + "T23:59:59.999Z");
};

/**
 * Convert a UTC date to Vietnam timezone
 * @param {Date|string} utcDate - UTC date
 * @returns {Date} Date in Vietnam timezone
 */
const toVietnamTime = (utcDate) => {
  const date = new Date(utcDate);
  return new Date(date.getTime() + VIETNAM_OFFSET_MS);
};

/**
 * Convert Vietnam time to UTC
 * @param {Date|string} vietnamDate - Vietnam date
 * @returns {Date} Date in UTC
 */
const toUTC = (vietnamDate) => {
  const date = new Date(vietnamDate);
  return new Date(date.getTime() - VIETNAM_OFFSET_MS);
};

/**
 * Format date for display in Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatVietnamDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Format time for display in Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
const formatVietnamTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format datetime for display in Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime string
 */
const formatVietnamDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString("vi-VN", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Check if a date is today in Vietnam timezone
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  const d = new Date(date);
  const today = getVietnamTodayStart();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return d >= today && d < tomorrow;
};

/**
 * Check if a date is in the past (Vietnam timezone)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
const isPast = (date) => {
  const d = new Date(date);
  return d < getVietnamTodayStart();
};

/**
 * Check if a date is in the future (Vietnam timezone)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
const isFuture = (date) => {
  const d = new Date(date);
  return d >= getVietnamTodayStart();
};

module.exports = {
  VIETNAM_TIMEZONE,
  VIETNAM_OFFSET_HOURS,
  VIETNAM_OFFSET_MS,
  getVietnamNow,
  getVietnamTodayStart,
  getVietnamTodayEnd,
  toVietnamTime,
  toUTC,
  formatVietnamDate,
  formatVietnamTime,
  formatVietnamDateTime,
  isToday,
  isPast,
  isFuture,
};
