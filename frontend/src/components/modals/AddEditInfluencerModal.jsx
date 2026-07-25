import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, IndianRupee, MapPin, User, Globe, Phone } from 'lucide-react';
import { useCreateInfluencer, useUpdateInfluencer } from '../../hooks/useInfluencers';

const influencerSchema = z.object({
  name: z.string().min(1, 'Influencer name is required'),
  handle: z.string().min(1, 'Handle/Username is required'),
  influencerType: z.enum(['Local Influencer', 'Standard Influencer']),
  platform: z.enum(['Instagram', 'YouTube', 'Facebook', 'Moj', 'Josh', 'X', 'Multi-platform']),
  category: z.string().min(1, 'Category is required'),
  cityLocation: z.string().optional().or(z.literal('')),
  followersCount: z.coerce.number().min(0, 'Followers must be >= 0'),
  engagementRate: z.coerce.number().min(0, 'Engagement rate must be >= 0'),
  pricing: z.object({
    reelCost: z.coerce.number().min(0),
    storyCost: z.coerce.number().min(0),
    postCost: z.coerce.number().min(0),
    eventCost: z.coerce.number().min(0),
  }),
  contactName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  profileUrl: z.string().optional().or(z.literal('')),
  mediaKitUrl: z.string().optional().or(z.literal('')),
  rating: z.coerce.number().min(1).max(5),
  notes: z.string().optional().or(z.literal('')),
});

const CATEGORIES = [
  'Food & Dining',
  'Fashion & Lifestyle',
  'Tech & Gadgets',
  'Entertainment & Comedy',
  'Fitness & Health',
  'Beauty & Makeup',
  'Local Events & Vlogs',
  'Travel & Tourism',
  'Business & Finance',
  'General / Multipurpose',
];

const PLATFORMS = ['Instagram', 'YouTube', 'Facebook', 'Moj', 'Josh', 'X', 'Multi-platform'];

export const AddEditInfluencerModal = ({ open, onOpenChange, influencer = null, defaultType = 'Standard Influencer' }) => {
  const isEditing = Boolean(influencer?._id);

  const form = useForm({
    resolver: zodResolver(influencerSchema),
    defaultValues: {
      name: '',
      handle: '',
      influencerType: defaultType,
      platform: 'Instagram',
      category: 'Lifestyle',
      cityLocation: '',
      followersCount: 50000,
      engagementRate: 4.5,
      pricing: {
        reelCost: 5000,
        storyCost: 2000,
        postCost: 4000,
        eventCost: 10000,
      },
      contactName: '',
      phone: '',
      whatsapp: '',
      email: '',
      profileUrl: '',
      mediaKitUrl: '',
      rating: 5,
      notes: '',
    },
  });

  const createInfluencer = useCreateInfluencer();
  const updateInfluencer = useUpdateInfluencer();

  useEffect(() => {
    if (open) {
      if (influencer) {
        form.reset({
          name: influencer.name || '',
          handle: influencer.handle || '',
          influencerType: influencer.influencerType || defaultType,
          platform: influencer.platform || 'Instagram',
          category: influencer.category || 'Lifestyle',
          cityLocation: influencer.cityLocation || '',
          followersCount: influencer.followersCount || 0,
          engagementRate: influencer.engagementRate || 0,
          pricing: {
            reelCost: influencer.pricing?.reelCost || 0,
            storyCost: influencer.pricing?.storyCost || 0,
            postCost: influencer.pricing?.postCost || 0,
            eventCost: influencer.pricing?.eventCost || 0,
          },
          contactName: influencer.contactName || '',
          phone: influencer.phone || '',
          whatsapp: influencer.whatsapp || '',
          email: influencer.email || '',
          profileUrl: influencer.profileUrl || '',
          mediaKitUrl: influencer.mediaKitUrl || '',
          rating: influencer.rating || 5,
          notes: influencer.notes || '',
        });
      } else {
        form.reset({
          name: '',
          handle: '@',
          influencerType: defaultType,
          platform: 'Instagram',
          category: 'Fashion & Lifestyle',
          cityLocation: defaultType === 'Local Influencer' ? 'Chennai' : '',
          followersCount: 25000,
          engagementRate: 4.2,
          pricing: {
            reelCost: 4000,
            storyCost: 1500,
            postCost: 3000,
            eventCost: 8000,
          },
          contactName: '',
          phone: '',
          whatsapp: '',
          email: '',
          profileUrl: '',
          mediaKitUrl: '',
          rating: 5,
          notes: '',
        });
      }
    }
  }, [open, influencer, defaultType, form]);

  const onSubmit = async (values) => {
    // Ensure handle starts with @
    let handleVal = values.handle.trim();
    if (!handleVal.startsWith('@')) handleVal = `@${handleVal}`;

    const payload = {
      ...values,
      handle: handleVal,
    };

    if (isEditing) {
      await updateInfluencer.mutateAsync({ id: influencer._id, data: payload });
    } else {
      await createInfluencer.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createInfluencer.isPending || updateInfluencer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {isEditing ? 'Edit Influencer Profile' : 'Add New Influencer'}
          </DialogTitle>
          <DialogDescription>
            Manually enter creator profile details, social reach, location, and commercial rate card for campaign planning.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Category / Type Selector */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="influencerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Influencer Layout / Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Local Influencer">📍 Local Influencer (City / Regional)</SelectItem>
                        <SelectItem value="Standard Influencer">🌐 Standard Influencer (Commercial / Macro)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Platform *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profile Info */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Creator Basic Profile</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator / Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Ananya V / Food Vlogs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Handle (@username) *</FormLabel>
                      <FormControl>
                        <Input placeholder="@chennai_foodie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category / Niche *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City / Region Location</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Chennai, Ambur, Bangalore..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Followers / Subscribers</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engagementRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement Rate (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Commercial Rate Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-emerald-500" /> Commercial Rates Breakdown
              </h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="pricing.reelCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Reel Cost (₹)</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricing.storyCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Story Cost (₹)</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricing.postCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Post Cost (₹)</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricing.eventCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Event Appearance (₹)</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information & Links */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" /> Contact & Links
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person / Manager Name</FormLabel>
                      <FormControl><Input placeholder="E.g., Agent Kumar" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input placeholder="influencer@agency.com" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile URL Link</FormLabel>
                      <FormControl><Input placeholder="https://instagram.com/handle" {...field} /></FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mediaKitUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media Kit Drive / PDF Link</FormLabel>
                      <FormControl><Input placeholder="https://drive.google.com/..." {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes & Rating */}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creator Rating (1 to 5 Stars)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars (Top Performing)</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ 4 Stars (Great ROI)</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ 3 Stars (Average)</SelectItem>
                        <SelectItem value="2">⭐⭐ 2 Stars (Below Avg)</SelectItem>
                        <SelectItem value="1">⭐ 1 Star (Not Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Internal Notes / Past Campaign Feedback</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Specific deliverables, audience demographics, prompt delivery..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Save Influencer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
