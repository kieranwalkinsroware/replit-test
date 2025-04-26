import React from 'react';
import { useLocation } from 'wouter';
import votaLogo from '@assets/vota-logo-white.png';

interface NavigationBarProps {
  showBackButton?: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ showBackButton = true }) => {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black flex items-center justify-between py-4 px-6 border-b border-gray-800">
      {showBackButton && (
        <button 
          className="rounded-md bg-gray-700 py-2 px-4 text-white flex items-center text-sm"
          onClick={handleBack}
        >
          <span className="material-icons mr-1">chevron_left</span> Back
        </button>
      )}
      <div className="flex-1 flex justify-center">
        <img src={votaLogo} alt="VOTA" className="h-7" />
      </div>
      <div className="w-10 h-10"></div> {/* Empty div for balanced spacing */}
    </div>
  );
};

export default NavigationBar;
