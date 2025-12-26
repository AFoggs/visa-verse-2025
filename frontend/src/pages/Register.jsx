import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, Check, X, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation rules
  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Name validation
    if (name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }

    // Email validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name.trim());
      navigate('/onboarding');
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Email is already registered'
          : err.code === 'auth/invalid-email'
            ? 'Invalid email address'
            : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const PasswordRule = ({ met, label }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-success-400' : 'text-dark-400'}`}>
      {met ? <Check size={14} /> : <X size={14} />}
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
            <Globe className="text-white" size={26} />
          </div>
          <span className="text-2xl font-semibold gradient-text">3Degrees</span>
        </Link>

        {/* Card */}
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-dark-300 mb-8">Start your journey to meaningful connections</p>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center gap-3"
            >
              <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-dark-200 mb-2">Your Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-dark-200 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`input pl-12 ${email && !isValidEmail(email) ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {email && !isValidEmail(email) && (
                <p className="text-red-400 text-xs mt-1">Please enter a valid email address</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-dark-200 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="input pl-12"
                  required
                />
              </div>
              {/* Password requirements */}
              {password && (
                <div className="mt-2 p-3 bg-dark-700 rounded-lg space-y-1">
                  <p className="text-xs text-dark-300 mb-2">Password must contain:</p>
                  <PasswordRule met={passwordRules.minLength} label="At least 8 characters" />
                  <PasswordRule met={passwordRules.hasLetter} label="At least 1 letter" />
                  <PasswordRule met={passwordRules.hasNumber} label="At least 1 number" />
                  <PasswordRule met={passwordRules.hasSpecial} label="At least 1 special character (!@#$%...)" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-dark-200 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={`input pl-12 ${confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !isValidEmail(email) || name.trim().length < 2 || password !== confirmPassword}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-dark-300 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
