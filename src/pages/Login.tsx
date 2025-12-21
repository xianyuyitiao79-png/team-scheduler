import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await signInWithEmail(email);
    
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Magic link sent! Check your email.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-zinc-900">
            Team Scheduler
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to access your shift dashboard
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>

            {message && (
              <div className={`text-sm text-center ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
