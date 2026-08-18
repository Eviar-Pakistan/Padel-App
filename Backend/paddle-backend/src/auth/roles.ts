export const Roles = {
  USER: 'user',
  PADDLE_OWNER: 'paddle_owner',
  SUPER_ADMIN: 'super_admin',
  COACH: 'coach',
  REFEREE: 'referee',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
