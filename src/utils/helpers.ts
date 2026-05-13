// Date parsing and formatting utilities for TPH Management

/** Parse day number from date strings like "03.May.1990", "05.May.1969", "14.May.2010" or "1990-05-03" */
export const parseDayFromDate = (dateStr: string): number => {
  if (!dateStr) return 99;
  const normalized = dateStr.replace(/\./g, ' ');
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d.getDate();

  const match = dateStr.match(/(\d{1,2})/);
  return match ? parseInt(match[1], 10) : 99;
};

/** Check if a date string matches today's day and month */
export const isTodayEvent = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const today = new Date();
  
  const normalized = dateStr.replace(/\./g, ' ');
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) {
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  }
  
  const todayMonth = today.toLocaleString('default', { month: 'short' });
  const day = parseDayFromDate(dateStr);
  return day === today.getDate() && dateStr.toLowerCase().includes(todayMonth.toLowerCase());
};

/** Check if a date string falls in the given short month string (e.g. "May") */
export const isMonthMatch = (dateStr: string, targetMonthShort: string): boolean => {
  if (!dateStr) return false;
  const normalized = dateStr.replace(/\./g, ' ');
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString('default', { month: 'short' }).toLowerCase() === targetMonthShort.toLowerCase();
  }
  return dateStr.toLowerCase().includes(targetMonthShort.toLowerCase());
};

export const isTodayBirthday = isTodayEvent;
export const isTodayAnniversary = isTodayEvent;
export const isTodayBaptism = isTodayEvent;

/** Format a phone number to international format for WhatsApp */
export const formatPhone = (mobile: string): string => {
  let phone = mobile.replace(/\D/g, '');
  if (phone.length === 10) phone = `91${phone}`;
  return phone;
};

/** Open WhatsApp with a pre-filled message */
export const openWhatsApp = (phone: string, message: string) => {
  const formattedPhone = formatPhone(phone);
  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
};

/** Chart colors for recharts */
export const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#f97316', '#84cc16'];

/** Animation Variants for Framer Motion */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

/** Trigger a system-wide push notification to all subscribed admins */
export const notifySystemAction = async (title: string, body: string, url: string = '/') => {
  try {
    await fetch('/api/notifications/notify-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url }),
    });
  } catch (err) {
    console.error('Failed to send push notification', err);
  }
};
