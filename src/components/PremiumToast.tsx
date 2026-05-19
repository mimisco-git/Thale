import { cn } from "../lib/utils";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertTriangle, Info, Zap, X } from "lucide-react";
import { Logo } from "./Logo";

interface PremiumToastProps {
  t: any;
  type: "success" | "info" | "error" | "default";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PremiumToast({ t, type, title, description, action }: PremiumToastProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    default: <Zap className="w-5 h-5" />,
  };

  const typeColors = {
    success: "text-brand-primary border-brand-primary",
    info: "text-brand-accent border-brand-accent",
    error: "text-brand-primary border-brand-primary bg-brand-primary/5",
    default: "text-black border-black",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
      className={cn(
        "relative w-[480px] bg-white border-2 border-black overflow-hidden flex flex-col shadow-[32px_32px_80px_rgba(0,0,0,0.12)] mb-4",
        type === "error" && "border-brand-primary ring-4 ring-brand-primary/10"
      )}
    >
      {/* Structural Scanline */}
      <motion.div 
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5">
            <Logo className="text-black" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/40">
            System Alert // {type}
          </p>
        </div>
        <button 
          onClick={() => t.dismiss(t.id)}
          className="p-1 hover:bg-black hover:text-white transition-all rounded-sm"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-8 flex items-start gap-8 relative z-10 bg-white">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className={cn(
            "flex-shrink-0 p-4 border-2 shadow-[4px_4px_0_rgba(0,0,0,1)]",
            typeColors[type]
          )}
        >
          {icons[type]}
        </motion.div>

        <div className="flex-1 space-y-3">
          <motion.h4 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black tracking-tighter uppercase leading-none text-black"
          >
            {title}
          </motion.h4>
          
          {description && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10" />
              <p className="text-sm font-bold text-black/60 leading-snug pl-6 italic">
                : "{description}"
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Area */}
      <AnimatePresence>
        {action && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            className="px-8 pb-8 bg-white relative z-10"
          >
            <button
              onClick={() => {
                action.onClick();
                t.dismiss(t.id);
              }}
              className="w-full h-12 bg-black text-white px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-primary transition-all group overflow-hidden relative"
            >
              <span className="relative z-10">{action.label}</span>
              <motion.div
                className="relative z-10"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-3 h-3 fill-current" />
              </motion.div>
              <motion.div 
                className="absolute inset-0 bg-brand-accent opacity-0 group-hover:opacity-10 transition-opacity" 
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="h-1.5 bg-black/5 w-full relative">
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className={cn(
            "h-full",
            type === "success" || type === "error" ? "bg-brand-primary" : "bg-black"
          )}
        />
      </div>

      {/* Metadata Stamp */}
      <div className="absolute bottom-4 right-1 pointer-events-none opacity-[0.03]">
        <p className="text-[12px] font-mono font-black uppercase tracking-[1em] rotate-180 [writing-mode:vertical-lr]">
          AUTH_SIG_VERIFIED
        </p>
      </div>
    </motion.div>
  );
}
