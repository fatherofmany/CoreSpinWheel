export const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-xl shadow-md ${className}`}>{children}</div>
);

export const CardContent = ({ children }) => (
  <div className="p-4">{children}</div>
);
