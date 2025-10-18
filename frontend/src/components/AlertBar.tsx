import React from 'react';


interface AlertBarProps {
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  showIcon?: boolean;
  onClose?: () => void;
}

const AlertBar: React.FC<AlertBarProps> = ({ 
  message = "Alert!", 
  type = "info",
  showIcon = true,
  onClose 
}) => {
  const alertStyles = {
    info: "bg-blue-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-4 shadow-lg z-50 mb-0 text-white ${alertStyles[type]}`} onClick={onClose}>
      <div className="container mx-auto flex items-center justify-center">
        <div className="flex items-center">
          {showIcon && (
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
          )}
          <span className="font-medium">{message}</span>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-4 text-current hover:opacity-70 transition-opacity"
            aria-label="Close alert"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertBar;