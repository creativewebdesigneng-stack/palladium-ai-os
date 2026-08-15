// Pure auth-driven UI predicates, shared by the public navigation and the
// post-OAuth redirect handoff. Kept side-effect free so they can be tested.

// Public routes the OAuth broker can land on after a successful sign-in.
export const AUTH_ENTRY_PATHS = ['/', '/login', '/register'];

/** True once the session is known and a user is present. */
export function isSignedIn({ authChecked, isAuthenticated } = {}) {
  return Boolean(authChecked && isAuthenticated);
}

/** Guest controls (Sign in / Sign up) render only when not signed in. */
export function showGuestAuthControls(state) {
  return !isSignedIn(state);
}

/** Only hand a signed-in user off from a public auth entry point. */
export function shouldConsumePostAuthRedirect(state, pathname) {
  return isSignedIn(state) && AUTH_ENTRY_PATHS.includes(pathname);
}
