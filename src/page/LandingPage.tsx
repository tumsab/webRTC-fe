import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Users, ArrowRight } from 'lucide-react';
import ErrorNotification from '../components/ErrorNotification';
import VideoBackground from '../components/VideoBackground';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim() === '') {
      setError('Please enter your name to continue');
      setShowError(true);
      return;
    }
    
    navigate(`/chatrandom/${encodeURIComponent(name.trim())}`);
  };

  const closeError = () => {
    setShowError(false);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <VideoBackground />
      
      <ErrorNotification 
        message={error}
        isVisible={showError}
        onClose={closeError}
      />

      <div className="container mx-auto px-4 py-12 h-screen flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <Video className="h-10 w-10 text-sky-400 mr-2" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
              ChatRandom
            </h1>
          </div>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Connect with interesting people from around the world through random video chats
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="card p-8">
            <div className="flex items-center mb-6">
              <Users className="h-6 w-6 text-sky-400 mr-2" />
              <h2 className="text-2xl font-semibold">Start Chatting</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                  Your Display Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="input-field"
                  autoComplete="off"
                />
              </div>
              
              <motion.button
                type="submit"
                className="btn-primary w-full flex items-center justify-center"
                whileTap={{ scale: 0.98 }}
              >
                Start Video Chat
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center space-x-6">
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-sky-400" />
              </div>
              <p className="text-sm text-slate-400">Meet New People</p>
            </motion.div>
            
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                <Video className="h-6 w-6 text-sky-400" />
              </div>
              <p className="text-sm text-slate-400">Video Chat</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;