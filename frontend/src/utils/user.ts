type NamedUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Readable name from a handle or email for accounts made before names were
 * asked ("priya1794289706157" -> "Priya", "rahul.verma@x.com" -> "Rahul Verma").
 */
function nameFromHandle(handle: string): string {
  return handle
    .split(/[._\-\s]+|\d+/)
    .filter(Boolean)
    .map(capitalise)
    .join(' ');
}

/** The name to show for a user: what they told us, or a tidy fallback. */
export function displayName(user: NamedUser | null | undefined): string {
  if (!user) return '';
  const given = user.name?.trim();
  if (given) return given;
  const handle = user.username || user.email?.split('@')[0] || '';
  return nameFromHandle(handle) || handle;
}

/** First name, for greetings. */
export function firstName(user: NamedUser | null | undefined): string {
  return displayName(user).split(' ')[0] ?? '';
}

/** Single letter for avatars. */
export function initialOf(user: NamedUser | null | undefined): string {
  return (displayName(user).charAt(0) || '?').toUpperCase();
}
