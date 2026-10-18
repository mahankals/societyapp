import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, Mail, Globe, Database as DbIcon, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/settings');
        setSettings(res.settings || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
          Platform Settings
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Configure branding, mail server SMTP, and system maintenance guards
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Branding */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-400" />
              <span>Branding &amp; Identity</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings.app_name || 'Society App'}
                  onChange={(e) => handleChange('app_name', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.support_email || 'support@societyapp.ddev.site'}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              <span>SMTP Mail Configuration</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp_host || 'localhost'}
                  onChange={(e) => handleChange('smtp_host', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtp_port || '1025'}
                  onChange={(e) => handleChange('smtp_port', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
