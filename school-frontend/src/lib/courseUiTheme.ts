/** Local overrides so Russian UI can be tested on Vite without prod migration. */

const key = (courseId: string) => `course_ui_theme_${courseId}`;

export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function getLocalCourseUiTheme(courseId?: string | null): string | null {
  if (!courseId) return null;
  try {
    return localStorage.getItem(key(courseId));
  } catch {
    return null;
  }
}

export function setLocalCourseUiTheme(courseId: string, theme: string) {
  try {
    localStorage.setItem(key(courseId), theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearLocalCourseUiTheme(courseId: string) {
  try {
    localStorage.removeItem(key(courseId));
  } catch {
    /* ignore */
  }
}

/** Prefer local override (dev tests), then server value. */
export function resolveCourseUiTheme(course?: { id?: string; ui_theme?: string } | null): string {
  if (!course) return 'DEFAULT';
  const local = course.id ? getLocalCourseUiTheme(course.id) : null;
  if (local) return local;
  return course.ui_theme || 'DEFAULT';
}
