import React from 'react';
import { Switch } from '../ui/switch';
import { Volume2, VolumeX } from 'lucide-react';

const UIControls = ({ autoClaimEnabled, setAutoClaimEnabled, soundEnabled, setSoundEnabled, darkMode, setDarkMode }) => {
  return (
    <div className="flex items-center space-x-4">
      
      {/* Auto-Claim Toggle */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Claim</span>
        <Switch checked={autoClaimEnabled} onCheckedChange={setAutoClaimEnabled} />
      </div>

      {/* Sound Toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Dark Mode Toggle */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
        <Switch checked={darkMode} onCheckedChange={setDarkMode} />
      </div>
    </div>
  );
};

export default UIControls;
