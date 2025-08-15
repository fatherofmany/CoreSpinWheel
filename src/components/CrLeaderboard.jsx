import React from 'react';

const dummyLeaderboard = [
  { address: '0xABC123...', cr: 1200 },
  { address: '0xDEF456...', cr: 900 },
  { address: '0xXYZ789...', cr: 750 },
  { address: 'You', cr: 0 }, // Placeholder for dynamic user
];

const CrLeaderboard = ({ userCr }) => {
  const sortedLeaderboard = dummyLeaderboard.map(player => {
    if (player.address === 'You') {
      return { ...player, cr: userCr };
    }
    return player;
  }).sort((a, b) => b.cr - a.cr);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Leaderboard</h2>
      <ul>
        {sortedLeaderboard.map((player, index) => (
          <li key={index} className="flex justify-between py-1">
            <span>{index + 1}. {player.address}</span>
            <span>{player.cr} Cr</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CrLeaderboard;
