// Placeholder for backward compatibility
// The actual database connection is now handled via Supabase

export default function dbConnect() {
  // This is a placeholder function for backward compatibility
  // Actual database operations are handled via Supabase in respective API routes
  console.warn('dbConnect is deprecated. Use Supabase client directly.');
  return Promise.resolve();
}
