import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Header = ({ onBack }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <img src="/coredao-logo.svg" alt="CoreDAO" className="w-20 h-20" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
            <span>CORE Wheel</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Test your luck with the spinning wheel!</p>
        </div>
      </div>
    </div>
  );
};

export default Header;
