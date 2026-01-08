'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  User,
  Bell,
  Shield,
  Key,
  Save,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: Key },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const user = useAuthStore((state) => state.user);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your Nurture Leads account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <nav className="space-y-1">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'api-keys' && <ApiKeysSettings />}
        </div>
      </div>
    </motion.div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to update profile
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium mb-2 block">
            First Name
          </label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="text-sm font-medium mb-2 block">
            Last Name
          </label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium mb-2 block">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Role</label>
          <Badge variant="secondary">{(user as any)?.role || 'N/A'}</Badge>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationsSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Manage your notification preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Notification settings coming soon...</p>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your account security</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Security settings coming soon...</p>
      </CardContent>
    </Card>
  );
}

function ApiKeysSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage your API keys for programmatic access</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">API key management coming soon...</p>
      </CardContent>
    </Card>
  );
}


