import React from "react";
import CrScorecards from "./CrScorecards";
import Confetti from "react-confetti";

const WelcomeTab = ({ onComplete }) => {
  return (
    <div className="relative x-12 space-y-8" >
      <Confetti recycle={false} numberOfPieces={150} gravity={0.3} />

      <div className="bg-white/80 dark:bg-gray-900/80 rounded-2xl p-6 shadow-xl max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-justify-center">
        🔥 Welcome to the Core Credit Revolution
        </h1>

        <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
          <strong>Core Credit (Cr)</strong> is the pulse of our gamified social economy built on top of the Coredao Blockchain Network through the Core
          SpinWheel Multi-Currency Gaming Experience! It’s not just a score—it’s your <em>status</em>, <em>influence</em>, and <em>governance access in </em>
           a  pre-tokenized digital ecosystem.
        </p>
        <p className="mt-4 text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
          Cr is the native pre-token economy unit of our entire ecosystem!. While non-tradable at the moment, Cr determines your eligibility to shape,
          own, and benefit from the platform <strong>before</strong> token is launched.
        </p>
        <p className="mt-4 text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
          Every spin, referral, streak, or quest feeds this Cr engine and empowers you!. Your efforts don’t just win prizes—they
          accumulate <strong>power and position</strong>. In a tokenless world, Cr gives early adopters a way to <em> build reputation</em>,
          <em>accrue governance</em>, and <em>unlock future financial upside</em>.
        </p>
        <p className="mt-4 text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
          You’re not just a player—you’re a <strong>co-creator of value</strong>. Spin to grow. Refer to rise. Earn Cr and
          <strong> write the rules</strong> before the public even knows what’s coming.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold transition"
          >
            Enter Dashboard
          </button>
        </div>
      </div>

      {/* Power Scorecards */}
      <div className="max-w-6xl mx-auto">
        <CrScorecards />
      </div>
    </div>
  );
};

export default WelcomeTab;
