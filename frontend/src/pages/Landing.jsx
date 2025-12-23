import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, Heart, Shield, ArrowRight } from 'lucide-react';

function Landing() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Companion',
      description: 'Your personal AI friend learns about you through natural conversation.',
    },
    {
      icon: Users,
      title: 'Meaningful Matches',
      description: 'Connect with people who share your interests and communication style.',
    },
    {
      icon: Heart,
      title: 'Real Connections',
      description: 'Move from strangers to friends with AI-powered conversation starters.',
    },
    {
      icon: Shield,
      title: '100% Private',
      description: 'Your companion conversations stay private. Only insights power matching.',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400/20 via-transparent to-accent-400/20" />

        {/* Animated orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-32">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shadow-2xl shadow-primary-400/30">
              <span className="text-white font-bold text-4xl">3°</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-center mb-6"
          >
            <span className="gradient-text">3Degrees</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-dark-200 text-center mb-4"
          >
            Connection through AI companionship
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-dark-300 text-center max-w-2xl mx-auto mb-12"
          >
            Your AI companion learns about you, understands your personality, and helps you
            connect with people who truly match your vibe.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="btn-primary px-8 py-4 text-lg flex items-center justify-center gap-2 group"
            >
              Get Started
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
            <Link
              to="/login"
              className="btn-secondary px-8 py-4 text-lg"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-24">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-4"
        >
          How It Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-dark-300 text-center mb-16 max-w-2xl mx-auto"
        >
          Three degrees of separation: You → Your AI → Their AI → Them
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card-hover p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mb-4">
                <feature.icon className="text-primary-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-dark-300 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Steps Section */}
      <div className="bg-dark-700/50 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Your Journey</h2>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            {[
              { step: 1, title: 'Meet Your Companion', desc: 'Chat with your AI friend' },
              { step: 2, title: 'Get Matched', desc: 'Find compatible connections' },
              { step: 3, title: 'Start Talking', desc: 'Break the ice naturally' },
              { step: 4, title: 'Build Friendships', desc: 'Deepen your connections' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-dark-300 text-sm">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block w-16 h-0.5 bg-gradient-to-r from-primary-400 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold mb-4"
        >
          Ready to Find Your People?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-dark-300 mb-8"
        >
          Join thousands making meaningful connections through AI companionship.
        </motion.p>
        <Link to="/register" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
          Create Your Account
          <ArrowRight size={20} />
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-600 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-dark-400 text-sm">
          <p>Built for VisaVerse AI Hackathon 2025</p>
          <p className="mt-2">3Degrees - Connection through AI companionship</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
