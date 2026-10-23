import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const SECTIONS = [
  {
    title: 'How the Portal Works',
    items: [
      { q: 'What is the Client Portal?', a: 'Your Client Portal is a dedicated workspace where you can review and approve content, track campaign performance, access reports, download assets, and communicate directly with your team — all in one place.' },
      { q: 'How do I navigate the portal?', a: 'Use the left sidebar to switch between sections: Dashboard, Content Review, Calendar, Reports, Downloads, Brand Assets, Invoices, Support, and Guidelines.' },
    ],
  },
  {
    title: 'Content Approval Process',
    items: [
      { q: 'How does content get submitted for review?', a: 'When your team finishes a piece of content, it is moved to "Send to Client" status. It will immediately appear in your "Ready for Review" tab under Content Review.' },
      { q: 'How do I approve content?', a: 'In the Content Review tab, find the item and click "Approve". You can optionally add a comment before confirming. The item will then move to "Approved" status.' },
      { q: 'How do I request a revision?', a: 'Click "Revise" next to any content item and fill in your revision notes. Your team will be notified and the item will be moved back into editing.' },
      { q: 'What happens after I approve?', a: 'Approved content is moved to the scheduling queue. Your team will schedule it for posting at the agreed time. Once published, it moves to "Posted" and eventually "Done".' },
      { q: 'Can I leave comments without approving or rejecting?', a: 'Yes — click the "View" button on any content item to open a detailed view where you can add feedback comments.' },
    ],
  },
  {
    title: 'Reports & Performance',
    items: [
      { q: 'When is reporting data updated?', a: 'Your account manager updates the AF Reporting Board monthly, typically within the first 5 business days of the following month.' },
      { q: 'Can I download my reports?', a: 'Yes — head to the Reports section and click "Export CSV" to download all monthly data as a spreadsheet.' },
      { q: 'What do the KPI metrics mean?', a: 'Ad Spend: total money spent on paid advertising. Opt-Ins: new leads who registered interest. Calls Booked: discovery/strategy calls scheduled. New Clients: new clients acquired. Cash Collected: payments received. Contracted Revenue: total new revenue signed.' },
    ],
  },
  {
    title: 'Billing & Invoices',
    items: [
      { q: 'Where can I find my invoices?', a: 'Go to the Invoices section in the sidebar. All your invoices are listed with their status, amount, and due date.' },
      { q: 'How do I pay an invoice?', a: 'Invoices marked as "Sent" or "Overdue" need payment. Contact your account manager or use the payment link sent to your email.' },
    ],
  },
  {
    title: 'Getting Help',
    items: [
      { q: 'How do I contact my account manager?', a: 'Go to the Support section and submit a support ticket, or email us directly. We respond within 24 business hours Mon–Fri.' },
      { q: 'What is the typical response time?', a: 'We aim to respond to all support tickets within 24 business hours. Urgent issues are escalated and addressed within 4 hours.' },
    ],
  },
];

export default function PortalGuidelines() {
  const [openSection, setOpenSection] = useState(0);
  const [openItem, setOpenItem]       = useState(null);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-foreground">Guidelines & FAQ</h2>
        <p className="text-xs mt-0.5 text-muted-foreground">Everything you need to know about using this portal.</p>
      </div>

      {/* Quick tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { emoji: '✅', label: 'Approve content from Ready for Review' },
          { emoji: '📊', label: 'Track monthly KPIs in Reports section' },
          { emoji: '💬', label: 'Submit requests via Support tickets' },
        ].map(tip => (
          <div
            key={tip.label}
            className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs"
          >
            <span className="text-xl">{tip.emoji}</span>
            <p className="text-xs font-semibold text-foreground">{tip.label}</p>
          </div>
        ))}
      </div>

      {/* FAQ Accordion */}
      {SECTIONS.map((section, si) => (
        <div key={section.title} className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === si ? -1 : si)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left bg-card hover:bg-secondary/60 transition-colors border-b border-border/60"
          >
            <BookOpen size={16} className="text-primary shrink-0" />
            <span className="text-sm font-bold flex-1 text-foreground">{section.title}</span>
            <ChevronDown
              size={15}
              className="text-muted-foreground transition-transform duration-200"
              style={{ transform: openSection === si ? 'rotate(180deg)' : '' }}
            />
          </button>

          {openSection === si && (
            <div className="divide-y divide-border/60">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openItem === key;
                return (
                  <div key={item.q} className="transition-colors">
                    <button
                      onClick={() => setOpenItem(isOpen ? null : key)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-secondary/40 transition-all"
                    >
                      <ChevronRight
                        size={13}
                        className="text-primary shrink-0 transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(90deg)' : '' }}
                      />
                      <span className="text-xs font-semibold flex-1 text-foreground">{item.q}</span>
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-5 sm:px-10 pb-4 pt-1"
                      >
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.a}</p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Bottom callout */}
      <div className="rounded-2xl p-5 flex items-center gap-4 bg-primary/10 border border-primary/20 shadow-xs">
        <CheckCircle2 size={24} className="text-primary shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Still have questions?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Don't hesitate to reach out via the Support section. Your dedicated account manager is here to help.
          </p>
        </div>
      </div>
    </div>
  );
}
