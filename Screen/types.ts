// src/types.ts

// 1. Single source of truth for user roles
export type UserType = 'admin' | 'employee' | 'shared';

// 2. All your notification change choices, plus any others you still use
export type NotificationType =
  | 'اضافة'
  | 'حجز'
  | 'الغاء حجز'
  | 'تسليم'
  | 'تعديل'
  | 'تنبيه';  // keep if you still emit this elsewhere

// 3. Full Notification shape
export interface Notification {
  id: number;
  message: string;
  time: string;
  date: string;
  type: NotificationType;
  isRead: boolean;
  details?: string;
}
