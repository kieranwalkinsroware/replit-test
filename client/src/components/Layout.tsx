import React from 'react';
import NavigationBar from './NavigationBar';
import votaLogo from '@assets/vota-logo-white.png';

interface LayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  isProcessing?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showBackButton = true, 
  isProcessing = false 
}) => {
  return (
    <div className="max-w-[759px] mx-auto pb-20">
      <NavigationBar showBackButton={showBackButton} />
      
      <div className="px-4 py-2 mt-16">
        {children}
      </div>
      
      {/* Footer */}
      <div className="mt-10 flex justify-between items-center text-sm text-gray-400 px-4">
        <a href="#" className="hover:text-white">Privacy Policy</a>
        <div className="text-right">
          <img src={votaLogo} alt="VOTA" className="h-6" />
        </div>
      </div>
      
      {/* Loading overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-primary border-gray-600 rounded-full animate-spin mb-4 mx-auto"></div>
            <h3 className="text-xl font-bold mb-2">Processing your AI video</h3>
            <p className="text-gray-300">This may take a few moments...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
