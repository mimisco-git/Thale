import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { PolymarketScanner } from "./components/PolymarketScanner";
import { NFIOracle } from "./components/NFIOracle";
import { AgentLeaderboard } from "./components/AgentLeaderboard";
import { AgentActivity } from "./components/AgentActivity";
import { Toaster } from "sonner";
import { auth, loginWithGoogle } from "./lib/firebase";
import { autonomousAgent } from "./services/autonomousAgent";
import { resetFakeData } from "./services/reputationService";

export default function App() {
  const [activeTab, setActiveTab] = useState("Terminal");
  const [isLaunched, setIsLaunched] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        setIsLaunched(true);
        // Clean up any fake data from old sessions
        await resetFakeData();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isLaunched && !autonomousAgent.isRunning()) {
      autonomousAgent.start();
    }
  }, [isLaunched]);

  const handleLaunch = async () => {
    try {
      await loginWithGoogle();
    } catch {
      // login dismissed - still launch
    }
    setIsLaunched(true);
  };

  const handleSignOut = async () => {
    autonomousAgent.stop();
    await auth.signOut();
    setIsLaunched(false);
    setActiveTab("Terminal");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Terminal":    return <Dashboard />;
      case "Signals":     return <SignalsPage />;
      case "Markets":     return <MarketsPage />;
      case "Leaderboard": return <LeaderboardPage />;
      default:            return <Dashboard />;
    }
  };

  if (!isLaunched) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut} user={user}>
      <Toaster
        position="top-right"
        expand={true}
        visibleToasts={5}
        toastOptions={{
          style: { background: "transparent", border: "none", boxShadow: "none", padding: 0 },
        }}
      />
      {renderContent()}
    </Layout>
  );
}

function SignalsPage() {
  return (
    <div className="py-8 space-y-8 px-4 lg:px-12">
      <div className="border-b-4 border-black pb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">Autonomous Reasoning</span>
        <h1 className="text-6xl font-black uppercase tracking-tighter mt-2">Live Signals</h1>
      </div>
      <AgentActivity />
    </div>
  );
}

function MarketsPage() {
  return (
    <div className="py-8 space-y-12 px-4 lg:px-12">
      <div className="border-b-4 border-black pb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">Prediction Intelligence</span>
        <h1 className="text-6xl font-black uppercase tracking-tighter mt-2">Market Oracle</h1>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <PolymarketScanner />
        <NFIOracle />
      </div>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <div className="py-8 space-y-8 px-4 lg:px-12">
      <div className="border-b-4 border-black pb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">Social Trading</span>
        <h1 className="text-6xl font-black uppercase tracking-tighter mt-2">Agent Leaderboard</h1>
      </div>
      <AgentLeaderboard />
    </div>
  );
}
