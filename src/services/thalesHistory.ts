import { db, auth } from '../lib/firebase';
import { collection, setDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

/**
 * ThalesHistory: Persists reasoning traces and settlement intents.
 */
export interface ThalesTrace {
  id: string;
  type: string;
  amount: string;
  status: string;
  agent: string;
  context: string;
  txHash: string;
  timestamp: string;
  userId?: string;
  details?: any;
}

class ThalesHistoryService {
  private traces: ThalesTrace[] = [];
  private unsub: (() => void) | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.initSync();
  }

  private initSync() {
    auth.onAuthStateChanged((user) => {
      if (this.unsub) {
        this.unsub();
        this.unsub = null;
      }
      if (user) {
        const q = query(
          collection(db, 'traces'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        this.unsub = onSnapshot(q, (snapshot) => {
          this.traces = snapshot.docs.map(d => {
            const data = d.data();
            return {
              ...data,
              timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
            } as ThalesTrace;
          });
          this.notify();
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'traces');
        });
      } else {
        this.traces = [];
        this.notify();
      }
    });
  }

  getTraces() {
    return this.traces;
  }

  async addTrace(trace: ThalesTrace) {
    const user = auth.currentUser;
    if (!user) {
      console.warn("User not logged in, trace only available locally");
      this.traces = [trace, ...this.traces];
      this.notify();
      return;
    }

    const traceData = {
      ...trace,
      userId: user.uid,
      timestamp: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'traces', trace.id), traceData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `traces/${trace.id}`);
    }
  }

  subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  updateTraceStatus(id: string, status: string) {
    // Local update only for now, would typically be a setDoc/updateDoc
    this.traces = this.traces.map(t => t.id === id ? { ...t, status } : t);
    this.notify();
    return this.traces;
  }
}

export const thalesHistory = new ThalesHistoryService();
