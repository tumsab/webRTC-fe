import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users, ArrowRight, Sparkles } from 'lucide-react';

function HomePage() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      navigate(`/chat/${encodeURIComponent(name.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl mb-6">
            <Video className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center justify-center gap-2">
            Video Chat
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-slate-300 text-lg">
            Connect instantly with crystal-clear video calls
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Users className="w-5 h-5" />
              Join Video Chat
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">HD</div>
                <div className="text-xs text-slate-400">Video Quality</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400 mb-1">P2P</div>
                <div className="text-xs text-slate-400">Secure Connection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            Secure, fast, and reliable video calling
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;