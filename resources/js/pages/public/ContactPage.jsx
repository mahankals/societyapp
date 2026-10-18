import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ContactPage() {
  const { appConfig } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate contact submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-white font-heading">
          Get in Touch
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-200/60 max-w-xl mx-auto">
          Have questions about SocietyApp or need assistance setting up your society? Our team is here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs flex items-start gap-3">
            <Mail className="w-5 h-5 text-brand-500 dark:text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">Email Us</p>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-1">{appConfig.supportEmail}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs flex items-start gap-3">
            <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">Phone Support</p>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-1">+91 98765 43210</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs flex items-start gap-3">
            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-surface-900 dark:text-white">Office Location</p>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-1">Pune, Maharashtra, India</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xl">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Message Sent Successfully!</h2>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 max-w-md mx-auto">
                Thank you for contacting us. We have received your inquiry and will respond within 24 business hours.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent text-xs font-medium transition-all"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Inquiry or Question"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-200/80 mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we assist your society?"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
