import React, { useState } from 'react';
import { Bell, ShieldAlert, UserX, CheckCircle, Mail, MessageSquare, Smartphone } from 'lucide-react';
import ChangePasswordCard from '@/components/settings/ChangePasswordCard';

interface NotificationSetting {
  id: string;
  label: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const ClientAccountSettings: React.FC = () => {
  const [activeStatus, setActiveStatus] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: '1', label: 'New Quote Received', email: true, sms: false, push: true },
    { id: '2', label: 'Job Status Updates', email: true, sms: true, push: true },
    { id: '3', label: 'Marketing & Promos', email: false, sms: false, push: false },
  ]);

  const toggleNotification = (id: string, field: keyof Omit<NotificationSetting, 'id' | 'label'>) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, [field]: !n[field] } : n
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Account Settings</h1>

        {/* Notifications Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <Bell className="text-emerald-500" size={20} />
            <h2 className="font-semibold text-lg">Notifications & Alerts</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-12 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 px-2">
              <div className="col-span-6">Activity Type</div>
              <div className="col-span-2 text-center flex justify-center gap-1"><Mail size={14}/> Email</div>
              <div className="col-span-2 text-center flex justify-center gap-1"><MessageSquare size={14}/> SMS</div>
              <div className="col-span-2 text-center flex justify-center gap-1"><Smartphone size={14}/> Push</div>
            </div>

            {notifications.map((n) => (
              <div key={n.id} className="grid grid-cols-12 items-center py-4 px-2 border-t border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="col-span-6 font-medium text-slate-600">{n.label}</div>
                {(['email', 'sms', 'push'] as const).map((type) => (
                  <div key={type} className="col-span-2 flex justify-center">
                    <input
                      type="checkbox"
                      checked={n[type]}
                      onChange={() => toggleNotification(n.id, type)}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <ChangePasswordCard />

        {/* Account Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <ShieldAlert className="text-emerald-500" size={20} />
            <h2 className="font-semibold text-lg">Account Status</h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-medium text-slate-700">
                  Current Status: 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${activeStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {activeStatus ? 'Active' : 'Deactivated'}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Deactivating will hide your profile and pause active requests.
                </p>
              </div>
              <button 
                onClick={() => setActiveStatus(!activeStatus)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeStatus 
                  ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                }`}
              >
                {activeStatus ? 'Deactivate Account' : 'Reactivate Account'}
              </button>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-4">
              <button className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
                Request Data Export
              </button>
              <button className="text-sm font-medium text-red-400 hover:text-red-600 transition-colors">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientAccountSettings;