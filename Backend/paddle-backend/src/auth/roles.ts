export const Roles = {
  USER: 'user',
  PADDLE_OWNER: 'paddle_owner',
  SUPER_ADMIN: 'super_admin',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
