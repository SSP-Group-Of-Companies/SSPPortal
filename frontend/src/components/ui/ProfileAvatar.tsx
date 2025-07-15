//Small component for profile + fallback
"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { UserCircle } from "lucide-react";

interface ProfileAvatarProps {
  size?: number; // Optional: size in pixels (default 32)
}

export default function ProfileAvatar({ size = 32 }: ProfileAvatarProps) {
  const { data: session } = useSession();
  const userImage = session?.user?.image;

  if (userImage) {
    return (
      <Image
        src={userImage}
        alt="User Profile"
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }

  return <UserCircle className="text-gray-600" width={size} height={size} />;
}
