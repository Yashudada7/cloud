import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  title: string;
  category?: string;
  categoryColor?: string;
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const BauhausCard: React.FC<CardProps> = ({ 
  title, 
  category, 
  categoryColor = 'bg-bauhaus-accent', 
  children, 
  actionText, 
  onAction,
  className = ""
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bauhaus-card flex flex-col h-full bg-white ${className}`}
    >
      {category && (
        <div className={`${categoryColor} p-2 border-b-3 border-black text-white font-black uppercase text-xs tracking-widest`}>
          {category}
        </div>
      )}
      <div className="p-5 flex-grow">
        <h3 className="text-4xl font-black mb-2 leading-none uppercase break-words">{title}</h3>
        <div className="text-xs font-bold uppercase tracking-wide leading-tight opacity-80">
          {children}
        </div>
      </div>
      {actionText && (
        <button 
          onClick={onAction}
          className="bg-black text-white p-4 font-black text-xl uppercase hover:bg-bauhaus-red transition-colors w-full text-center"
        >
          {actionText} →
        </button>
      )}
    </motion.div>
  );
};

export const BauhausButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'black' | 'outline';
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = "", type = "button", disabled = false }) => {
  const variants = {
    primary: 'bg-[var(--primary)] text-white hover:bg-black',
    secondary: 'bg-[var(--secondary)] text-black hover:bg-white',
    accent: 'bg-[var(--accent)] text-white hover:bg-black',
    black: 'bg-black text-white hover:bg-[var(--primary)]',
    outline: 'bg-transparent text-black hover:bg-black hover:text-white'
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bauhaus-button ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export const BauhausGrid: React.FC<{ children: React.ReactNode, cols?: number, md?: number }> = ({ children, cols = 3 }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };
  
  return (
    <div className={`grid ${gridCols[cols as keyof typeof gridCols]} gap-8`}>
      {children}
    </div>
  );
};

export const BauhausTag: React.FC<{ children: React.ReactNode, color?: string, className?: string }> = ({ children, color = 'bg-black', className = '' }) => (
  <span className={`${color} text-white px-2 py-1 font-bold text-xs uppercase inline-block ${className}`}>
    {children}
  </span>
);
