'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Eye,
  Settings,
  Link as LinkIcon,
  Palette,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Save,
} from 'lucide-react';
import {
  useStorefrontPreview,
  useUpdateStorefront,
  useUpdateStorefrontSlug,
} from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';

export default function StorefrontManagementPage() {
  const { data: storefront, isLoading } = useStorefrontPreview();
  const updateStorefront = useUpdateStorefront();
  const updateSlug = useUpdateStorefrontSlug();

  const [settings, setSettings] = useState({
    bannerImage: '',
    logo: '',
    description: '',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    customCss: '',
    socialLinks: {
      website: '',
      twitter: '',
      linkedin: '',
      facebook: '',
    },
  });

  const [storefrontSlug, setStorefrontSlug] = useState('');

  useEffect(() => {
    if (storefront) {
      const storefrontSettings = storefront.marketplaceUser.storefrontSettings || {};
      setSettings({
        bannerImage: storefrontSettings.bannerImage || '',
        logo: storefrontSettings.logo || '',
        description: storefrontSettings.description || '',
        primaryColor: storefrontSettings.primaryColor || '#10b981',
        secondaryColor: storefrontSettings.secondaryColor || '#059669',
        customCss: storefrontSettings.customCss || '',
        socialLinks: {
          website: storefrontSettings.socialLinks?.website || '',
          twitter: storefrontSettings.socialLinks?.twitter || '',
          linkedin: storefrontSettings.socialLinks?.linkedin || '',
          facebook: storefrontSettings.socialLinks?.facebook || '',
        },
      });
      setStorefrontSlug(storefront.marketplaceUser.storefrontSlug || '');
    }
  }, [storefront]);

  const handleSaveSettings = async () => {
    try {
      await updateStorefront.mutateAsync(settings);
      toast.success('Storefront settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    }
  };

  const handleSaveSlug = async () => {
    if (!storefrontSlug) {
      toast.error('Storefront slug is required');
      return;
    }
    try {
      await updateSlug.mutateAsync(storefrontSlug);
      toast.success('Storefront slug updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update slug');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!storefront) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Storefront not set up</h3>
          <p className="text-muted-foreground mb-4">
            Please complete your marketer profile to set up your storefront.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Storefront Management</h1>
        <p className="text-muted-foreground mt-1">
          Customize your public storefront
        </p>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storefront Preview</CardTitle>
              <CardDescription>
                This is how your storefront will appear to buyers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: settings.primaryColor + '10' }}>
                {/* Banner */}
                {settings.bannerImage && (
                  <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${settings.bannerImage})` }} />
                )}
                
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {settings.logo && (
                      <img src={settings.logo} alt="Logo" className="h-16 w-16 rounded-full" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">{storefront.marketplaceUser.companyName}</h2>
                      {storefront.marketplaceUser.isVerified && (
                        <Badge variant="secondary" className="mt-1">Verified</Badge>
                      )}
                    </div>
                  </div>
                  
                  {settings.description && (
                    <p className="text-muted-foreground mb-4">{settings.description}</p>
                  )}

                  {/* Social Links */}
                  {(settings.socialLinks.website || settings.socialLinks.twitter || settings.socialLinks.linkedin || settings.socialLinks.facebook) && (
                    <div className="flex gap-2">
                      {settings.socialLinks.website && (
                        <Button variant="outline" size="sm">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </Button>
                      )}
                      {settings.socialLinks.twitter && (
                        <Button variant="outline" size="sm">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </Button>
                      )}
                      {settings.socialLinks.linkedin && (
                        <Button variant="outline" size="sm">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </Button>
                      )}
                      {settings.socialLinks.facebook && (
                        <Button variant="outline" size="sm">
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Listings */}
                <div className="p-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Listings ({storefront.listings.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {storefront.listings.map((listing) => (
                      <Card key={listing.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{listing.name}</CardTitle>
                          {listing.industry && (
                            <Badge variant="outline">{listing.industry}</Badge>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold mb-2">{listing.pricePerLead} LR</div>
                          {listing.metrics && (
                            <div className="text-sm text-muted-foreground">
                              {listing.metrics.totalLeadsDelivered} leads delivered
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Aggregate Metrics */}
                <div className="p-6 border-t bg-muted/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{storefront.aggregateMetrics.totalListings}</div>
                      <div className="text-sm text-muted-foreground">Listings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{storefront.aggregateMetrics.totalLeadsDelivered}</div>
                      <div className="text-sm text-muted-foreground">Leads Delivered</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{storefront.aggregateMetrics.averageRating.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Storefront Slug */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Storefront URL
              </CardTitle>
              <CardDescription>
                Your storefront will be available at /storefront/your-slug
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Storefront Slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={storefrontSlug}
                    onChange={(e) => setStorefrontSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-company"
                  />
                  <Button onClick={handleSaveSlug} disabled={updateSlug.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bannerImage">Banner Image URL</Label>
                <Input
                  id="bannerImage"
                  value={settings.bannerImage}
                  onChange={(e) => setSettings({ ...settings, bannerImage: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={settings.logo}
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={4}
                  placeholder="Tell buyers about your company..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="h-10 w-20"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="h-10 w-20"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      placeholder="#059669"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Add links to your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={settings.socialLinks.website}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socialLinks: { ...settings.socialLinks, website: e.target.value },
                    })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={settings.socialLinks.twitter}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socialLinks: { ...settings.socialLinks, twitter: e.target.value },
                    })
                  }
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={settings.socialLinks.linkedin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socialLinks: { ...settings.socialLinks, linkedin: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={settings.socialLinks.facebook}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socialLinks: { ...settings.socialLinks, facebook: e.target.value },
                    })
                  }
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} disabled={updateStorefront.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save All Settings
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

