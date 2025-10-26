/**
 * Utility function to check if a session is from yesterday
 * @param openedAt - The opened_at timestamp string from the session
 * @returns true if the session is from a different day than today
 */
export function isYesterdaySession(openedAt: string | null | undefined): boolean {
  if (!openedAt) {
    return false;
  }
  
  try {
    const sessionDate = new Date(openedAt);
    const today = new Date();
    
    // Check if the date is valid
    if (isNaN(sessionDate.getTime())) {
      console.error('Invalid date format for openedAt:', openedAt);
      return false;
    }
    
    // Compare dates by setting time to midnight for accurate day comparison
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return sessionDay.getTime() !== todayDay.getTime();
  } catch (error) {
    console.error('Invalid date format for openedAt:', openedAt, error);
    return false;
  }
}
