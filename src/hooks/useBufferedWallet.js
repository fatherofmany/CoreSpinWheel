import { useState, useEffect } from 'react';
import { hashSpinData } from '../utils/hashUtils'; // We'll build this too

export const useBufferedWallet = (initialBalance = 0) => {
  const [bufferedBalance, setBufferedBalance] = useState(initialBalance);
  const [spinProofs, setSpinProofs] = useState([]);

  // Log each spin (SpinResult = from processSpin)
  const logSpin = async (spinResult) => {
    const spinId = Date.now();
    const multiplier = spinResult.outcome.multiplier;
    const timestamp = new Date().toISOString();

    const hash = await hashSpinData(spinId, multiplier, timestamp);

    setSpinProofs((prev) => [...prev, { spinId, multiplier, timestamp, hash }]);
    setBufferedBalance((prev) => parseFloat((prev + spinResult.netWinnings).toFixed(4)));
  };

  const resetBuffer = () => {
    setSpinProofs([]);
    setBufferedBalance(0);
  };

  // Store in memory instead of localStorage - removed localStorage usage
  // Note: Data will be lost on page refresh, which is acceptable for buffered state

  return {
    bufferedBalance,
    spinProofs,
    logSpin,
    resetBuffer,
    setBufferedBalance,
  };
};