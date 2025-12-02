import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, Users, MapPin, Phone, Heart, FileText, Save, Loader2 } from 'lucide-react';
import { WomenSafetySettings as WomenSafetySettingsType } from '@/types';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export function WomenSafetySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<WomenSafetySettingsType>({
    women_only_group_preference: false,
    location_sharing_enabled: false,
    emergency_contacts: [
      { name: '', phone: '' },
      { name: '', phone: '' },
    ],
    medical_conditions: '',
    insurance_provider: '',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['women-safety-settings', user?.id],
    queryFn: async () => {
      const response = await api.get('/women-safety/settings');
      return response.data.data as WomenSafetySettingsType;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        women_only_group_preference: settings.women_only_group_preference || false,
        location_sharing_enabled: settings.location_sharing_enabled || false,
        emergency_contacts: settings.emergency_contacts || [
          { name: '', phone: '' },
          { name: '', phone: '' },
        ],
        medical_conditions: settings.medical_conditions || '',
        insurance_provider: settings.insurance_provider || '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: WomenSafetySettingsType) => {
      const response = await api.put('/women-safety/settings', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['women-safety-settings'] });
      toast.success('Safety settings saved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    // Validation
    const hasValidEmergencyContact = formData.emergency_contacts.some(
      (contact) => contact.name?.trim() && contact.phone?.trim()
    );

    if (!hasValidEmergencyContact) {
      toast.error('Please add at least one emergency contact with name and phone number');
      return;
    }

    // Filter out empty contacts
    const cleanedData = {
      ...formData,
      emergency_contacts: formData.emergency_contacts.filter(
        (contact) => contact.name?.trim() || contact.phone?.trim()
      ),
    };

    saveMutation.mutate(cleanedData);
  };

  const updateEmergencyContact = (index: number, field: 'name' | 'phone', value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  const addEmergencyContact = () => {
    if (formData.emergency_contacts.length < 5) {
      setFormData((prev) => ({
        ...prev,
        emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '' }],
      }));
    }
  };

  const removeEmergencyContact = (index: number) => {
    if (formData.emergency_contacts.length > 2) {
      setFormData((prev) => ({
        ...prev,
        emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index),
      }));
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please login to access your women's safety settings.
          </p>
          <Button onClick={() => (window.location.href = '/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <Card className="p-8 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Women's Safety Settings</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Manage your safety preferences and emergency information
        </p>
      </div>

      <Card className="p-8 space-y-8">
        {/* Travel Preferences */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Travel Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="women_only_group" className="text-base font-semibold">
                  Prefer Women-Only Groups
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be matched with women-only travel groups by default
                </p>
              </div>
              <Switch
                id="women_only_group"
                checked={formData.women_only_group_preference}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, women_only_group_preference: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="location_sharing" className="text-base font-semibold">
                  Enable Location Sharing
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your real-time location with group members for safety
                </p>
              </div>
              <Switch
                id="location_sharing"
                checked={formData.location_sharing_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, location_sharing_enabled: checked })
                }
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Emergency Contacts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Emergency Contacts</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These contacts will be notified in case of an emergency. Please provide at least 2 contacts.
          </p>

          <div className="space-y-3">
            {formData.emergency_contacts.map((contact, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary/30 rounded-lg"
              >
                <div className="space-y-2">
                  <Label htmlFor={`contact_name_${index}`}>
                    Contact {index + 1} Name {index < 2 && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={`contact_name_${index}`}
                    placeholder="Full Name"
                    value={contact.name || ''}
                    onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`contact_phone_${index}`}>
                      Phone Number {index < 2 && <span className="text-red-500">*</span>}
                    </Label>
                    {index >= 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                        className="h-6 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    id={`contact_phone_${index}`}
                    type="tel"
                    placeholder="+1234567890"
                    value={contact.phone || ''}
                    onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {formData.emergency_contacts.length < 5 && (
            <Button
              variant="outline"
              onClick={addEmergencyContact}
              className="w-full mt-3"
            >
              Add Another Contact
            </Button>
          )}
        </section>

        <Separator />

        {/* Medical Information */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Medical Information</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medical_conditions">Medical Conditions / Allergies</Label>
              <Textarea
                id="medical_conditions"
                placeholder="List any medical conditions, allergies, or medications that emergency responders should know about..."
                value={formData.medical_conditions || ''}
                onChange={(e) =>
                  setFormData({ ...formData, medical_conditions: e.target.value })
                }
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This information will only be shared with emergency services if needed
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Insurance Information */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Travel Insurance</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurance_provider">Insurance Provider</Label>
            <Input
              id="insurance_provider"
              placeholder="e.g., Allianz Global Assistance, World Nomads"
              value={formData.insurance_provider || ''}
              onChange={(e) =>
                setFormData({ ...formData, insurance_provider: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Optional but highly recommended for all travelers
            </p>
          </div>
        </section>

        <Separator />

        {/* Privacy Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">
                Your safety information is encrypted and stored securely. Emergency contacts will
                only be notified when you explicitly trigger an emergency alert or if our system
                detects you may be in danger. Medical information is only shared with emergency
                services when necessary.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-black font-semibold"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
