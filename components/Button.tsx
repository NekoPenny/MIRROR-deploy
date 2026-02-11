
import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', disabled, ...props }) => {
  const baseStyle = "px-6 py-3 font-bold text-lg w-full flex items-center justify-center gap-2 select-none paper-texture";
  
  const variants = {
    primary: "bg-[#FF6B6B] text-[#2D2D2D] border-2 border-transparent shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
    secondary: "bg-white text-[#2D2D2D] border-2 border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.08)]",
    outline: "bg-transparent text-[#2D2D2D] border-2 border-dashed border-[#2D2D2D] shadow-none hover:bg-black/5",
    ghost: "bg-transparent border-2 border-transparent shadow-none text-[#2D2D2D] hover:bg-black/5",
  };

  return (
    <motion.button
      className={`rounded-lg transition-colors ${baseStyle} ${variants[variant]} ${disabled ? 'opacity-60 cursor-not-allowed grayscale' : 'sticker-button'} ${className}`}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 [&>svg]:shrink-0 [&>svg]:w-5 [&>svg]:h-5">{children}</span>
    </motion.button>
  );
};

export default Button;
