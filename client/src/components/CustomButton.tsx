import React from 'react';

interface CustomButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  primary?: boolean;
  secondary?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  primary = true,
  secondary = false,
  type = 'button',
}) => {
  const baseClasses = 'px-4 py-3 rounded-md w-full font-bold';
  const primaryClasses = primary ? 'bg-primary text-white' : '';
  const secondaryClasses = secondary ? 'bg-gray-800 text-white' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const buttonClasses = `${baseClasses} ${primaryClasses} ${secondaryClasses} ${disabledClasses} ${className}`;
  
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default CustomButton;
