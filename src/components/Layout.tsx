import React from "react";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { LayoutGrid, Bell, Target, Trophy, LogOut, User } from "lucide-react";
import { cn } from "../lib/utils";
import type { User as FirebaseUser } from "firebase/auth";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Terminal",    tab: "Terminal" },
  { icon: Bell,       label: "Signals",     tab: "Signals" },
  { icon: Target,     label: "Markets",     tab: "Markets" },
  { icon: Trophy,     label: "Leaders",     tab: "Leaderboard" },
];

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  user: FirebaseUser | null;
}

export function Layout({ children, activeTab, onTabChange, onSignOut, user }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex font-sans selection:bg-brand-primary/30">

      {/* Sidebar */}
      <aside className="hidden lg:flex w-[80px] border-r-[3px] border-black flex-col items-center h-screen sticky top-0 bg-white z-50">
        {/* Logo */}
        <div className="p-5 border-b-[3px] border-black w-full flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center p-2">
            <Logo className="text-white" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 w-full">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-2 py-6 border-b border-black/10 transition-all",
                activeTab === item.tab
                  ? "bg-black text-white"
                  : "text-black hover:bg-black hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-black text-[7px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User + Sign out */}
        <div className="w-full border-t-[3px] border-black">
          {user && (
            <div className="p-3 flex flex-col items-center gap-1 border-b border-black/10">
              {user.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 border-2 border-black rounded-none" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-black/5 flex items-center justify-center">
                  <User className="w-4 h-4 text-black/40" />
                </div>
              )}
              <span className="text-[6px] font-black uppercase text-black/40 text-center leading-tight truncate w-full text-center">
                {user.email?.split("@")[0]}
              </span>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex flex-col items-center justify-center gap-2 py-5 bg-brand-primary text-white hover:bg-black transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-black text-[7px] uppercase tracking-widest">Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-white border-4 border-black z-50 flex items-center justify-around shadow-[8px_8px_0_rgba(0,0,0,1)]">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.tab}
            onClick={() => onTabChange(item.tab)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 transition-all",
              activeTab === item.tab ? "text-brand-primary" : "text-black/40"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="flex flex-col items-center justify-center gap-1 p-2 text-brand-primary"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[7px] font-black uppercase">Out</span>
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-4 lg:p-0 pb-24 lg:pb-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
