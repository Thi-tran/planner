/**
 * Project Context Utilities
 * 
 * Manages active project state in localStorage for persistence across sessions.
 */

const ACTIVE_PROJECT_KEY = 'planner_active_project';

export interface ActiveProject {
  id: string;
  name: string;
  color: string;
}

export function getActiveProject(): ActiveProject | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(ACTIVE_PROJECT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setActiveProject(project: ActiveProject): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearActiveProject(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Validates and restores the active project from localStorage.
 * Checks if the project still exists in the database.
 * 
 * @returns The active project if valid, null otherwise
 */
export async function validateAndRestoreActiveProject(): Promise<ActiveProject | null> {
  const stored = getActiveProject();
  if (!stored) return null;
  
  try {
    // Verify project still exists
    const response = await fetch(`/api/projects/${stored.id}`);
    if (!response.ok) {
      // Project no longer exists, clear context
      clearActiveProject();
      return null;
    }
    // Project exists, keep the context
    return stored;
  } catch {
    // API error, clear context to be safe
    clearActiveProject();
    return null;
  }
}
