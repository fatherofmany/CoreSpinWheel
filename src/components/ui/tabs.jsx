import { useState } from 'react';

export const Tabs = ({ value, onValueChange, children }) => {
  return <div>{children}</div>;
};

export const TabsList = ({ children }) => (
  <div className="flex space-x-2 border-b border-gray-300 mb-4">{children}</div>
);

export const TabsTrigger = ({ value, children, isActive, onClick }) => (
  <button
    className={`px-4 py-2 rounded-t-lg font-semibold ${isActive ? 'bg-white text-blue-600 border-t border-l border-r' : 'bg-gray-100 text-gray-500'}`}
    onClick={() => onClick(value)}
  >
    {children}
  </button>
);

export const TabsContent = ({ value, activeTab, children }) => {
  if (value !== activeTab) return null;
  return <div>{children}</div>;
};
