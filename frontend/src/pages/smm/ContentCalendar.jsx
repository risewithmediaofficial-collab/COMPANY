import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Tag, Filter } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { PageHeader } from '../../components/ui/page';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

const EVENT_TYPES = [
  { id: 'Post', label: 'Scheduled Post', color: 'bg-blue-500 text-white' },
  { id: 'Launch', label: 'Campaign Launch', color: 'bg-emerald-500 text-white' },
  { id: 'Deadline', label: 'Creative Deadline', color: 'bg-amber-500 text-white' },
  { id: 'Approval', label: 'Approval Deadline', color: 'bg-purple-500 text-white' },
];

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [tasks, setTasks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '', type: 'Post', date: format(new Date(), 'yyyy-MM-dd'), priority: 'Medium'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, campRes] = await Promise.all([
        smmApi.getTasks({ limit: 200 }),
        smmApi.getCampaigns({ limit: 100 }),
      ]);
      if (tasksRes.data?.success) setTasks(tasksRes.data.data || []);
      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await smmApi.createTask({
        title: `[${newEvent.type}] ${newEvent.title}`,
        deadline: newEvent.date,
        priority: newEvent.priority,
        status: 'Todo',
      });
      toast.success('Calendar event added');
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to create event');
    }
  };

  const nextPeriod = () => setCurrentDate(addMonths(currentDate, 1));
  const prevPeriod = () => setCurrentDate(subMonths(currentDate, 1));

  // Calendar matrix generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Map events to date
  const getEventsForDay = (targetDay) => {
    const dayTasks = tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), targetDay));
    const dayCamps = campaigns.filter((c) => c.startDate && isSameDay(new Date(c.startDate), targetDay));
    
    return [
      ...dayCamps.map((c) => ({ id: c._id, title: `🚀 Launch: ${c.name}`, type: 'Launch', color: 'bg-emerald-500 text-white' })),
      ...dayTasks.map((t) => ({ id: t._id, title: t.title, type: 'Deadline', color: 'bg-amber-500 text-white' })),
    ];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content & Campaign Calendar"
        subtitle="Schedule posts, campaign launches, creative deadlines & approvals"
        actions={
          <button onClick={() => setIsDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Add Calendar Event
          </button>
        }
      />

      <SMMSubNav />

      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</h3>
          <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl">
            <button onClick={prevPeriod} className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-card">
              Today
            </button>
            <button onClick={nextPeriod} className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          {EVENT_TYPES.map((type) => (
            <div key={type.id} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${type.color}`} />
              <span className="text-muted-foreground font-medium">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month View Grid */}
      <div className="app-card overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/30 text-center text-xs font-bold text-muted-foreground py-3">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border min-h-[600px]">
          {days.map((d, i) => {
            const dayEvents = getEventsForDay(d);
            const isSelectedMonth = isSameMonth(d, monthStart);
            const isToday = isSameDay(d, new Date());

            return (
              <div
                key={i}
                className={`p-2 min-h-[100px] flex flex-col justify-start transition-colors ${
                  !isSelectedMonth ? 'bg-secondary/20 text-muted-foreground/40' : 'bg-card'
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {format(d, 'd')}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-24">
                  {dayEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg truncate shadow-2xs ${ev.color}`}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Schedule Event / Deadline"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Event Title *</label>
            <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="app-input" placeholder="e.g. Meta Reel Post - Summer Promo" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Event Type</label>
              <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="app-select">
                <option value="Post">Scheduled Post</option>
                <option value="Launch">Campaign Launch</option>
                <option value="Deadline">Creative Deadline</option>
                <option value="Approval">Approval Deadline</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Scheduled Date</label>
              <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="app-input" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Schedule Event</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
