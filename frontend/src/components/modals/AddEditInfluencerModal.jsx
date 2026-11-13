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
  DialogClose,
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
import { Sparkles, IndianRupee, MapPin, User, Globe, Phone, X } from '@/components/ui/muiIcons';
import { useCreateInfluencer, useUpdateInfluencer } from '../../hooks/useInfluencers';

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}, z.number().min(0).default(0));

const influencerSchema = z.object({
  name: z.string().min(1, 'Influencer name is required'),
  handle: z.string().min(1, 'Handle/Username is required'),
  influencerType: z.enum(['Local Influencer', 'Standard Influencer']),
  platform: z.enum(['Instagram', 'YouTube', 'Facebook', 'Moj', 'Josh', 'X', 'Multi-platform']),
  category: z.string().min(1, 'Category is required'),
  cityLocation: z.string().optional().or(z.literal('')),
  followersCount: optionalNumber,
  engagementRate: optionalNumber,
  pricing: z.object({
    reelCost: optionalNumber,
    storyCost: optionalNumber,
    postCost: optionalNumber,
    eventCost: optionalNumber,
  }),
  contactName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  profileUrl: z.string().optional().or(z.literal('')),
  mediaKitUrl: z.string().optional().or(z.literal('')),
  rating: z.coerce.number().min(1).max(5).default(5),
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
      followersCount: '',
      engagementRate: '',
      pricing: {
        reelCost: '',
        storyCost: '',
        postCost: '',
        eventCost: '',
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
          followersCount: influencer.followersCount ?? '',
          engagementRate: influencer.engagementRate ?? '',
          pricing: {
            reelCost: influencer.pricing?.reelCost ?? '',
            storyCost: influencer.pricing?.storyCost ?? '',
            postCost: influencer.pricing?.postCost ?? '',
            eventCost: influencer.pricing?.eventCost ?? '',
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
          handle: '',
          influencerType: defaultType,
          platform: 'Instagram',
          category: 'Fashion & Lifestyle',
          cityLocation: '',
          followersCount: '',
          engagementRate: '',
          pricing: {
            reelCost: '',
            storyCost: '',
            postCost: '',
            eventCost: '',
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-background max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 bg-background shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
              <Sparkles size={20} className="shrink-0" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {isEditing ? 'Edit Influencer Profile' : 'Add New Influencer'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Creator profile details, social reach, location, and commercial rates
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="influencerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Influencer Layout / Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Local Influencer">Local Influencer (City / Regional)</SelectItem>
                          <SelectItem value="Standard Influencer">Standard Influencer (Commercial / Macro)</SelectItem>
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
                      <FormLabel className="text-sm font-semibold text-foreground">Primary Platform *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
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

                {/* Creator Basic Profile */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Creator / Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Ananya V / Chennai Food Vlogs"
                          className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
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
                      <FormLabel className="text-sm font-semibold text-foreground">Social Handle (@username) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="@chennai_foodie"
                          className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
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
                      <FormLabel className="text-sm font-semibold text-foreground">Category / Niche *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
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
                      <FormLabel className="text-sm font-semibold text-foreground">City / Region Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Chennai, Bangalore, Coimbatore..."
                          className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
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
                      <FormLabel className="text-sm font-semibold text-foreground">Followers / Subscribers Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g. 50000"
                          className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engagementRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Engagement Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="e.g. 4.5"
                          className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Commercial Rates */}
                <div className="rounded-2xl bg-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-foreground shrink-0" /> Commercial Rates Breakdown
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pricing.reelCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Reel Cost (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g. 15000"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.storyCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Story Cost (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g. 5000"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.postCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Feed Post Cost (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g. 10000"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.eventCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Event / Store Appearance Cost (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g. 25000"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information & Links */}
                <div className="rounded-2xl bg-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-primary" /> Contact & Links
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Contact Person / Manager Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Agent Kumar"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+91 98765 43210"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">WhatsApp Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+91 98765 43210"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="influencer@agency.com"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Profile URL Link</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://instagram.com/handle"
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mediaKitUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">Media Kit Drive / PDF Link</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://drive.google.com/..."
                              className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 "
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Rating & Notes */}
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Creator Rating (1 to 5 Stars)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/75 px-4 text-sm focus:ring-2 focus:ring-primary/20 ">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 Stars (Top Performing)</SelectItem>
                          <SelectItem value="4">4 Stars (Great ROI)</SelectItem>
                          <SelectItem value="3">3 Stars (Average)</SelectItem>
                          <SelectItem value="2">2 Stars (Below Avg)</SelectItem>
                          <SelectItem value="1">1 Star (Not Recommended)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Internal Notes / Past Campaign Feedback</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specific deliverables, audience demographics, prompt delivery..."
                          className="min-h-[90px] rounded-xl bg-secondary/75 p-3.5 text-sm focus:ring-2 focus:ring-primary/20 "
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 bg-background px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
                >
                  {isLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Save Influencer'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
