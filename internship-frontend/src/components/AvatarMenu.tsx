interface AvatarMenuProps {
  email: string | null;
}

export default function AvatarMenu({ email }: AvatarMenuProps) {
  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <div
      title={email ?? "Guest"}
      className="w-9 h-9 rounded-full bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer"
    >
      {initial}
    </div>
  );
}
