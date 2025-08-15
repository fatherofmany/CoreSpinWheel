import React, { useState, useEffect } from 'react';
import CrLeaderboard from './CrLeaderboard';
import { CrService } from '../services/CoreCreditsService';

const CrChallengesPanel = ({ onClose }) => {
  const [userCr, setUserCr] = useState(0);
  const [milestones, setMilestones] = useState({ spins: 0 });
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);


  useEffect(() => {
  const fetchCrData = async () => {
    try {
      const balance = await CrService.getBalance();
      const userMilestones = await CrService.getMilestones();

      setUserCr(balance);
      setMilestones(userMilestones);

      // ✅ Trigger confetti only on milestone threshold
      const reachedMilestone = userMilestones.spins === 10 || userMilestones.spins === 50;
      if (reachedMilestone) {
        setShowConfetti(true);
        // Auto-disable after 3s
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (err) {
      console.error('Failed to load Core Credits data:', err);
    }
  };

  fetchCrData();
  setTimeout(() => setVisible(true), 50); // trigger slide-in animation
}, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose(), 300);
  };

  // ✨ Confetti stars component (inline)
  const ConfettiStars = () => (
    <div className="absolute inset-0 pointer-events-none z-0 animate-confetti opacity-30">
      {[...Array(35)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-twinkle"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      ></div>

      {/* Sliding Panel with confetti background */}
      <div
        className={`relative w-80 h-full shadow-2xl overflow-hidden transition-transform duration-300 ease-in-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}
          bg-gradient-to-br from-orange-500/70 via-orange-600/70 to-orange-700/70
          dark:from-orange-600/70 dark:via-orange-700/70 dark:to-orange-800/70
          text-white
        `}
      >
        {showConfetti && <ConfettiStars />}


        <div className="relative z-10 p-4">
          <button
            onClick={handleClose}
            className="text-white hover:text-red-300 font-bold mb-4 text-right w-full"
          >
            Close ✕
          </button>

          <h2 className="text-2xl font-bold mb-6">Core Credits Sc</h2>

          {/* Balance */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold">Your Cr Balance</h3>
            <p className="text-3xl font-bold">{userCr} Cr</p>
          </div>

          {/* Challenges */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold">Spin Challenges</h3>
            <p>Spins Done: {milestones.spins || 0}</p>
            <p>
              Next Milestone:{' '}
              {milestones.spins >= 50
                ? '🎉 Completed!'
                : milestones.spins >= 10
                ? '50 Spins'
                : '10 Spins'}
            </p>
          </div>

          {/* Leaderboard */}
          <CrLeaderboard userCr={userCr} />

          {/* Events */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2">Events & Announcements</h3>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>🔥 Spin Streak Challenge: Earn Cr for every 10 spins!</li>
              <li>🏁 Leaderboard resets every Sunday</li>
              <li>🎁 Referral Cr Doubles this week!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrChallengesPanel;
