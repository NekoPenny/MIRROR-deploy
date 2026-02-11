
import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Optional: 1 = forward, -1 = back. Adds subtle x offset for directional feel. */
  direction?: number;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, direction = 1 }) => {
  const xOffset = direction * 12;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99, x: xOffset }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.01, x: -xOffset }}
      transition={{ 
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="h-full w-full flex flex-col"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
