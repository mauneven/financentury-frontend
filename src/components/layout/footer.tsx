"use client";

import { Wallet } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground bg-background py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-4" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Financentury
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
