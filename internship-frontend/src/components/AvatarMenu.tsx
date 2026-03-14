interface AvatarMenuProps {
  email: string | null;
}

export default function AvatarMenu({ email }: AvatarMenuProps) {
  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <button
      type="button"
      title={email ?? "Guest"}
      aria-label="User menu"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {initial}
    </button>
  );
}
