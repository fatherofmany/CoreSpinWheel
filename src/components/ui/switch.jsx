import React from 'react';

const Switch = ({ checked, onCheckedChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
          checked ? 'translate-x-6' : ''
        }`}
      ></div>
    </button>
  );
};

export { Switch };
