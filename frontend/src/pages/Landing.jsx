import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, MapPin, Shield, ArrowRight, Plane, Home, Globe } from 'lucide-react';

function Landing() {
  const features = [
    {
      icon: Globe,
      title: 'Destination-Based',
      description: 'Connect with locals and travelers headed to your destination country or city.',
    },
    {
      icon: Sparkles,
      title: 'AI Companion',
      description: 'Your AI companion learns about you and helps build your mobility profile naturally.',
    },
    {
      icon: Users,
      title: 'Locals & Travelers',
      description: 'Whether you live there or are moving there, find people connected to your destination.',
    },
    {
      icon: Shield,
      title: 'Intentional Connections',
      description: 'Every connection is opt-in and purpose-driven. See why each match was suggested.',
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
              <Globe className="text-white" size={40} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-center mb-6"
          >
            <span className="gradient-text">VisaVerse</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-dark-200 text-center mb-4"
          >
            Feel less alone while moving across the world
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-dark-300 text-center max-w-2xl mx-auto mb-12"
          >
            Connect locals who want to welcome newcomers with travelers relocating, studying,
            working, or visiting. Destination-based matching helps you find people connected
            to where you're going.
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
              Create Your Profile
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
          Connection infrastructure for a globally mobile world
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
              { step: 1, title: 'Choose Your Role', desc: 'Local or Traveler', icon: Users },
              { step: 2, title: 'Set Your Destination', desc: 'Country + optional city', icon: MapPin },
              { step: 3, title: 'Find Connections', desc: 'See why each match fits', icon: Sparkles },
              { step: 4, title: 'Start Connecting', desc: 'Chat with AI icebreakers', icon: Globe },
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

      {/* Use Cases Section */}
      <div className="max-w-7xl mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Who Is This For?</h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Travelers */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent-400/20 flex items-center justify-center">
                <Plane className="text-accent-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Travelers</h3>
            </div>
            <ul className="space-y-2 text-dark-300">
              <li>Relocating to a new country</li>
              <li>Studying abroad</li>
              <li>Moving for work or career</li>
              <li>Visiting for tourism or family</li>
            </ul>
            <p className="mt-4 text-sm text-dark-200">
              Find locals who can help you feel welcome before you even arrive.
            </p>
          </motion.div>

          {/* Locals */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-400/20 flex items-center justify-center">
                <Home className="text-primary-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Locals</h3>
            </div>
            <ul className="space-y-2 text-dark-300">
              <li>Welcome newcomers to your city</li>
              <li>Cultural exchange opportunities</li>
              <li>Professional networking</li>
              <li>Language practice</li>
            </ul>
            <p className="mt-4 text-sm text-dark-200">
              Share your city and connect with people from around the world.
            </p>
          </motion.div>
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
          Ready to Connect With Your Destination?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-dark-300 mb-8"
        >
          Whether you're moving somewhere new or welcoming those who are, VisaVerse helps you feel less alone.
        </motion.p>
        <Link to="/register" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
          Get Started
          <ArrowRight size={20} />
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-600 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-dark-400 text-sm">
          <p>Built for VisaVerse AI Hackathon 2025</p>
          <p className="mt-2">VisaVerse - Connection infrastructure for global mobility</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
