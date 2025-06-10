import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertCircle } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  message, 
  isVisible, 
  onClose 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="flex items-center bg-error-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p className="text-sm font-medium mr-2">{message}</p>
            <button 
              onClick={onClose}
              className="ml-auto flex-shrink-0 text-white hover:text-white/80 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ErrorNotification;