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
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, X } from 'lucide-react';
import { useCreateCommunication, useUpdateCommunication } from '../../hooks/useCommunications';
import { useUsers } from '../../hooks/useUsers';
import { useClients } from '../../hooks/useClients';

const schema = z.object({
  subject: z.string().min(3, 'Subject is required'),
  message: z.preprocess(
    (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
    z.string().min(10, 'Message must be at least 10 characters').optional(),
  ),
  category: z.enum(['support', 'project', 'billing', 'general', 'internal', 'approval']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedParticipant: z.string().optional(),
});

export const CommunicationModal = ({ open, onOpenChange, communication, isClient }) => {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      message: '',
      category: isClient ? 'support' : 'general',
      priority: 'medium',
      assignedParticipant: '',
    },
  });
  
  const { data: users = [] } = useUsers({ enabled: open });
  const { data: clients = [] } = useClients({}, { enabled: open });
  const createCommunication = useCreateCommunication();
  const updateCommunication = useUpdateCommunication();
  const isLoading = createCommunication.isPending || updateCommunication.isPending;
  const availableClients = clients.filter((client) => client.userId?._id || client.userId);
  const availableUsers = users.filter((user) => ['superAdmin', 'manager', 'employee'].includes(user.role));

  useEffect(() => {
    form.reset({
      subject: communication?.subject || '',
      message: '',
      category: communication?.category || (isClient ? 'support' : 'general'),
      priority: communication?.priority || 'medium',
      assignedParticipant: '',
    });
  }, [communication, form, open, isClient]);

  const onSubmit = async (data) => {
    let participants = [];
    if (data.assignedParticipant && data.assignedParticipant !== 'unassigned') {
      const [model, id] = data.assignedParticipant.split('_');
      if (model && id) {
        participants.push({ user: id, userModel: model, role: 'assignee' });
      }
    }

    const payload = { 
       subject: data.subject,
       message: data.message,
       category: data.category,
       priority: data.priority,
       participants
    };

    if (communication) {
      await updateCommunication.mutateAsync({
        id: communication._id,
        data: {
          subject: data.subject,
          priority: data.priority,
          category: data.category,
          addParticipants: participants,
        },
      });
    } else {
      await createCommunication.mutateAsync(payload);
    }

    if (!createCommunication.isError && !updateCommunication.isError) {
      form.reset({
        subject: '',
        message: '',
        category: isClient ? 'support' : 'general',
        priority: 'medium',
        assignedParticipant: '',
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <MessageSquare size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {communication ? 'Edit Conversation Details' : 'New Conversation'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                {isClient ? 'Open a new support ticket or ask a question to our team.' : 'Start a new client conversation or internal team thread.'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Subject *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g., Need help with XYZ..."
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
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
                      <FormLabel className="text-sm font-semibold text-foreground">Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isClient ? (
                            <>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="project">Project</SelectItem>
                              <SelectItem value="billing">Billing</SelectItem>
                              <SelectItem value="approval">Approval</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="support">Client Support</SelectItem>
                              <SelectItem value="project">Project Discussion</SelectItem>
                              <SelectItem value="internal">Internal Team</SelectItem>
                              <SelectItem value="approval">Approvals</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Priority *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isClient && (
                  <FormField
                    control={form.control}
                    name="assignedParticipant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Include Participant</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs">
                              <SelectValue placeholder="Select user or client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Leave Unassigned</SelectItem>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Team Members</div>
                            {availableUsers.map((u) => (
                              <SelectItem key={u._id} value={`User_${u._id}`}>{u.name} (Team)</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Clients</div>
                            {availableClients.map((c) => (
                              <SelectItem key={c._id} value={`Client_${c._id}`}>{c.company || c.name} (Client)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!communication && (
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">Initial Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write your first message here..."
                            className="min-h-[120px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
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
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
                >
                  {isLoading ? 'Saving...' : communication ? 'Update Settings' : 'Start Conversation'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
