import { toast } from "sonner";
import { PremiumToast } from "../components/PremiumToast";
import React from "react";

/**
 * Event Types for the Settlement Engine
 */
export enum SettlementEvent {
  ESCROWED = "ESCROWED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
  FINALIZED = "FINALIZED"
}

interface SettlementPayload {
  id: string;
  amount: string;
  txHash: string;
  timestamp: string;
}

/**
 * NotificationService: Frontend-side push notification handler.
 * Interfaces with the TransactionMonitor logic to alert users of state changes.
 */
export const notificationService = {
  notify(type: SettlementEvent, payload: SettlementPayload) {
    const { id, amount, txHash } = payload;
    
    // Trigger listeners
    const list = (this as any).listeners[type];
    if (list) {
      list.forEach((cb: any) => cb(payload));
    }

    switch (type) {
      case SettlementEvent.ESCROWED:
        toast.custom((t) => (
          <PremiumToast 
            t={t}
            type="success"
            title="Funds Escrowed"
            description={`Settlement ${id} for ${amount} is now secured in Arc L1.`}
            action={{
              label: "Review Escrow Details",
              onClick: () => window.open(`https://explorer.circle.com/tx/${txHash}`, "_blank")
            }}
          />
        ));
        break;
      case SettlementEvent.RELEASED:
        toast.custom((t) => (
          <PremiumToast 
            t={t}
            type="info"
            title="Settlement Released"
            description={`Agent verified proof. ${amount} successfully paid out.`}
            action={{
              label: "View Explorer",
              onClick: () => window.open(`https://explorer.circle.com/tx/${txHash}`, "_blank")
            }}
          />
        ));
        break;
      case SettlementEvent.REFUNDED:
        toast.custom((t) => (
          <PremiumToast 
            t={t}
            type="error"
            title="Settlement Refunded"
            description={`Escrow ${id} has been reverted to sender.`}
          />
        ));
        break;
      case SettlementEvent.FINALIZED:
        toast.custom((t) => (
          <PremiumToast 
            t={t}
            type="default"
            title="Protocol Finality"
            description={`Arc Testnet confirmed TX ${txHash} with sub-second finality.`}
          />
        ));
        break;
    }
  },

  /**
   * Mock: Simulates a push notification from the TransactionMonitor
   */
  simulatePush() {
    setTimeout(() => {
      this.notify(SettlementEvent.FINALIZED, {
        id: "NX-8824",
        amount: "5,000 USDC",
        txHash: "0x3f2...9a1",
        timestamp: new Date().toISOString()
      });
    }, 5000);
  },

  listeners: {} as Record<string, ((payload: any) => void)[]>,

  on(type: SettlementEvent, cb: (payload: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
    return () => {
      this.listeners[type] = this.listeners[type].filter(l => l !== cb);
    };
  }
};
