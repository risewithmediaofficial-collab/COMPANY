import React, { useState } from 'react';
import { Settings, Key, Bell, Shield, CheckCircle2, Zap } from 'lucide-react';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function SMMSettings() {
  const [metaSettings, setMetaSettings] = useState({
    appId: '', appSecret: '', accessToken: '', adAccountId: '', autoSync: true
  });
  const [googleSettings, setGoogleSettings] = useState({
    developerToken: '', clientId: '', clientSecret: '', customerId: '', autoSync: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('SMM Module settings and API configurations updated');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="SMM Module Settings"
        subtitle="Configure default currency, notification triggers & future Meta/Google Ads API sync"
      />

      <SMMSubNav />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meta Ads API Integration Section */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              Meta
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Meta Ads API Integration (Future Sync)</h3>
              <p className="text-xs text-muted-foreground">Connect Meta Graph API to auto-sync ad spend, reach, CTR & CPL metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Meta App ID</label>
              <input type="text" value={metaSettings.appId} onChange={e => setMetaSettings({...metaSettings, appId: e.target.value})} className="app-input" placeholder="1234567890..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Meta App Secret</label>
              <input type="password" value={metaSettings.appSecret} onChange={e => setMetaSettings({...metaSettings, appSecret: e.target.value})} className="app-input" placeholder="••••••••••••" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">System User Access Token</label>
              <input type="password" value={metaSettings.accessToken} onChange={e => setMetaSettings({...metaSettings, accessToken: e.target.value})} className="app-input" placeholder="EAAB..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Default Ad Account ID</label>
              <input type="text" value={metaSettings.adAccountId} onChange={e => setMetaSettings({...metaSettings, adAccountId: e.target.value})} className="app-input" placeholder="act_12345678" />
            </div>
          </div>
        </div>

        {/* Google Ads API Section */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              Google
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Google Ads API Integration (Future Sync)</h3>
              <p className="text-xs text-muted-foreground">Connect Google Ads REST/gRPC API for automated keyword & campaign syncing</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Developer Token</label>
              <input type="password" value={googleSettings.developerToken} onChange={e => setGoogleSettings({...googleSettings, developerToken: e.target.value})} className="app-input" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Customer ID</label>
              <input type="text" value={googleSettings.customerId} onChange={e => setGoogleSettings({...googleSettings, customerId: e.target.value})} className="app-input" placeholder="123-456-7890" />
            </div>
          </div>
        </div>

        {/* Notifications & Threshold Triggers */}
        <div className="app-card p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground">Automated SMM Alerts & Triggers</h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              Notify when campaign daily budget is 90% exhausted
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              Alert when Cost Per Lead (CPL) exceeds ₹500
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              Send notification for pending client ad approvals
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              Alert when ROAS drops below 1.5x
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl text-sm shadow-lg shadow-primary/20 hover:opacity-90">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
