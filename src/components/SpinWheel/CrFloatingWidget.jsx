import React, { useState, useEffect } from 'react';
import { CrService } from '../../services/CoreCreditsService';
import { PartyPopper } from 'lucide-react';
import CrChallengesPanel from '../CrChallengesPanel';

const CrFloatingWidget = () => {
  const [crBalance, setCrBalance] = useState(CrService.loadBalance());
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCrBalance(CrService.getBalance());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white py-2 px-4 rounded-full shadow-lg flex items-center space-x-2 cursor-pointer"
        onClick={() => setPanelOpen(true)}
      >
        <PartyPopper size={20} />
        <span>{crBalance} Cr</span>
      </div>
      {panelOpen && <CrChallengesPanel onClose={() => setPanelOpen(false)} />}
    </>
  );
};

export default CrFloatingWidget;