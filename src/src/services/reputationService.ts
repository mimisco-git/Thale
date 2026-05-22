/**
 * reputationService.ts
 * Real reputation tracking from Firestore.
 * New users start at honest zeros. XP accumulates from real agent actions.
 */
import { db, auth } from '../lib/firebase';
import { setDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export interface ReputationStats {
  userId: string;
  totalSettled: number;
  todayVolume: number;
  reasoningXP: number;
  citizenTier: string;
  trustScore: number;
  yieldBearing: number;
  lastYield: string;
  traceCount: number;
}

const ZERO_STATS: ReputationStats = {
  userId: "",
  totalSettled: 0,
  todayVolume: 0,
  reasoningXP: 0,
  citizenTier: "Citizen",
  trustScore: 100,
  yieldBearing: 0,
  lastYield: "+0.00",
  traceCount: 0,
};

function tierFromXP(xp: number): string {
  if (xp >= 50000) return "Oracle";
  if (xp >= 25000) return "Vanguard";
  if (xp >= 10000) return "Architect";
  if (xp >= 2500)  return "Initiate";
  return "Citizen";
}

class UserReputationService {
  private stats: ReputationStats = { ...ZERO_STATS };
  private unsub: (() => void) | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    auth.onAuthStateChanged((user) => {
      if (this.unsub) { this.unsub(); this.unsub = null; }

      if (user) {
        this.unsub = onSnapshot(
          doc(db, "reputation", user.uid),
          (d) => {
            if (d.exists()) {
              const data = d.data() as ReputationStats;
              this.stats = { ...data, citizenTier: tierFromXP(data.reasoningXP || 0) };
            } else {
              // Brand new user: start at real zeros
              const initial: ReputationStats = {
                ...ZERO_STATS,
                userId: user.uid,
              };
              setDoc(doc(db, "reputation", user.uid), { ...initial, updatedAt: serverTimestamp() })
                .catch((e) => handleFirestoreError(e, OperationType.CREATE, `reputation/${user.uid}`));
              this.stats = initial;
            }
            this.notify();
          },
          (err) => handleFirestoreError(err, OperationType.GET, `reputation/${user.uid}`)
        );
      } else {
        // Guest: show zeros
        this.stats = { ...ZERO_STATS };
        this.notify();
      }
    });
  }

  getStats() { return this.stats; }

  async addXP(amount: number) {
    const newXP = this.stats.reasoningXP + amount;
    await this.updateStats({
      reasoningXP: newXP,
      citizenTier: tierFromXP(newXP),
      trustScore: Math.min(999, this.stats.trustScore + Math.floor(amount / 50)),
      traceCount: (this.stats.traceCount || 0) + 1,
    });
  }

  async recordVolume(amount: number) {
    await this.updateStats({
      todayVolume: this.stats.todayVolume + amount,
      totalSettled: this.stats.totalSettled + amount,
    });
  }

  async recordYield(usdc: number) {
    await this.updateStats({
      yieldBearing: this.stats.yieldBearing + usdc,
      lastYield: `+${usdc.toFixed(4)}`,
    });
  }

  private async updateStats(updates: Partial<ReputationStats>) {
    this.stats = { ...this.stats, ...updates };
    this.notify();

    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(
        doc(db, "reputation", user.uid),
        { ...this.stats, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `reputation/${user.uid}`);
    }
  }

  subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  private notify() { this.listeners.forEach((l) => l()); }
}

export const reputationService = new UserReputationService();

// Export a helper to reset fake data for existing users
export async function resetFakeData() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const { getDoc, doc: firestoreDoc } = await import("firebase/firestore");
    const snap = await getDoc(firestoreDoc(db, "reputation", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      // If yieldBearing is unrealistically high (> 10000), reset it
      if (data.yieldBearing > 10000 || data.totalSettled > 100000) {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(firestoreDoc(db, "reputation", user.uid), {
          ...ZERO_STATS,
          userId: user.uid,
          updatedAt: new Date(),
        });
        console.log("[Reputation] Reset fake data for user", user.uid);
      }
    }
  } catch (e) {
    console.warn("[Reputation] Reset check failed:", e);
  }
}
