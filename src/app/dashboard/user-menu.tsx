"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface UserMenuProps {
  displayName: string;
  avatarUrl: string | null;
}

export default function UserMenu({ displayName, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeDisplayName = displayName?.trim() || "User";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={safeDisplayName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
            {safeDisplayName.slice(0, 1)}
          </span>
        )}
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {safeDisplayName}
        </span>
        <span className="text-sm text-zinc-500">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <a
            href="/dashboard/api-keys"
            role="menuitem"
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setOpen(false)}
          >
            APIキー管理
          </a>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            >
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}