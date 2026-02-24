/**
 * Authentication utilities for working with Supabase auth
 */

/**
 * Checks if user is authenticated
 */
export const isAuthenticated = (session: any): boolean => {
  return !!session?.user?.id;
};

/**
 * Gets user's email from session
 */
export const getUserEmail = (session: any): string | undefined => {
  return session?.user?.email;
};

/**
 * Gets user's role from metadata
 */
export const getUserRole = (session: any): string => {
  return session?.user?.user_metadata?.role || 'user';
};

/**
 * Checks if user has a specific role
 */
export const hasRole = (session: any, role: string): boolean => {
  const userRole = getUserRole(session);
  return userRole === role;
};

/**
 * Checks if user is admin
 */
export const isAdmin = (session: any): boolean => {
  return hasRole(session, 'admin');
};

/**
 * Gets user's full name from session
 */
export const getUserName = (session: any): string => {
  return session?.user?.user_metadata?.full_name || session?.user?.email || 'User';
};

/**
 * Gets user's avatar URL from session
 */
export const getUserAvatar = (session: any): string | undefined => {
  return session?.user?.user_metadata?.avatar_url;
};

/**
 * Formats user display name with fallback
 */
export const formatUserDisplay = (session: any): string => {
  const name = getUserName(session);
  const email = getUserEmail(session);
  
  if (name && name !== email) {
    return name;
  }
  return email?.split('@')[0] || 'User';
};
