import React, { useState } from 'react';
import { BarChart3, CheckCircle2, TrendingUp, Info, Trash2 } from '@/components/ui/muiIcons';

export const parseClientMetrics = (row, daysInMonth = 30) => {
  const clientName = row.client?.companyName || 'Unknown';
  const plan = row.plan || '';

  // Extract reels: e.g. "8R + 4P" -> 8
  const rMatch = plan.match(/(\d+)\s*R/i);
  const reels = rMatch ? parseInt(rMatch[1], 10) : 0;

  // Extract posts: e.g. "8R + 4P" -> 4
  const pMatch = plan.match(/(\d+)\s*P/i);
  const posts = pMatch ? parseInt(pMatch[1], 10) : 0;

  // Extract stories: e.g. "30 STORIES" -> 30, default 30
  const storyPlan = row.storyPlan || '';
  const sMatch = storyPlan.match(/(\d+)/);
  const stories = sMatch ? parseInt(sMatch[1], 10) : (daysInMonth || 30);

  const total = reels + posts + stories;

  // Done count: count of 'done' in postStatus + count of 'done' in storyStatus
  const postDone = (row.days || []).filter(d => d.postStatus === 'done').length;
  const storyDone = (row.days || []).filter(d => d.storyStatus === 'done').length;
  const done = postDone + storyDone;

  const pending = Math.max(0, total - done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    clientName,
    reels,
    posts,
    stories,
    total,
    done,
    pending,
    pct,
    rawRow: row,
  };
};

// Inline editable number for Reels, Posts, Stories
const EditableNumber = ({ value, onSave, min = 0, max = 999 }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const num = parseInt(draft, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onSave(num);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        min={min}
        max={max}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-12 text-center text-xs py-0.5 px-1 rounded bg-background text-foreground font-bold outline-none focus:ring-2 focus:ring-brand/40 tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="w-full text-center hover:bg-secondary rounded py-0.5 text-xs font-semibold text-foreground transition-colors cursor-pointer tabular-nums"
      title="Click to edit quota"
    >
      {value}
    </button>
  );
};

export const ClientCompletionDashboard = ({
  rows = [],
  daysInMonth = 30,
  onUpdatePlan,
  onUpdateStories,
  onDeleteClient,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const metrics = rows.map((r) => parseClientMetrics(r, daysInMonth));

  // Precise SVG geometry for high clarity
  const svgWidth = 750;
  const svgHeight = 360;
  const marginLeft = 52;
  const marginRight = 24;
  const marginTop = 36;
  const marginBottom = 120; // Ample breathing room for -45deg angled text
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = svgHeight - marginTop - marginBottom; // ~204px

  const colWidth = metrics.length > 0 ? plotWidth / metrics.length : 60;
  const barWidth = Math.min(32, Math.max(18, colWidth * 0.44));

  const baselineY = marginTop + plotHeight;

  // Grid tick percentages
  const ticks = [
    { pct: 100, y: marginTop },
    { pct: 75,  y: marginTop + plotHeight * 0.25 },
    { pct: 50,  y: marginTop + plotHeight * 0.50 },
    { pct: 25,  y: marginTop + plotHeight * 0.75 },
    { pct: 0,   y: baselineY },
  ];

  return (
    <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-foreground shrink-0" size={18} />
          <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight uppercase">
            Client Completion &amp; Performance Analytics
          </h2>
        </div>
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
          Real-time summary synced with monthly tracker status
        </span>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ── Left Column: Summary Table + Workflow Callout ── */}
        <div className="xl:col-span-7 flex flex-col space-y-3">
          <div className="rounded-xl overflow-hidden bg-card">
            {/* Monochrome Header Banner */}
            <div className="bg-zinc-950 text-zinc-50 text-center py-2 sm:py-2.5 px-3 sm:px-4 ">
              <h3 className="text-xs md:text-sm font-black tracking-widest uppercase">
                CLIENT COMPLETION DASHBOARD
              </h3>
            </div>

            {/* Table with crisp CRM grid borders */}
            <div className="overflow-x-auto [touch-action:pan-x] [-webkit-overflow-scrolling:touch]">
              <table className="w-full text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-secondary text-muted-foreground uppercase text-[10.5px] font-black tracking-wider">
                    <th className="py-2.5 px-3 text-left w-36 ">CLIENT</th>
                    <th className="py-2.5 px-2 text-center w-14 ">REELS</th>
                    <th className="py-2.5 px-2 text-center w-14 ">POSTS</th>
                    <th className="py-2.5 px-2 text-center w-16 ">STORIES</th>
                    <th className="py-2.5 px-2 text-center w-14 ">TOTAL</th>
                    <th className="py-2.5 px-2 text-center w-14 ">DONE</th>
                    <th className="py-2.5 px-2 text-center w-16 ">PENDING</th>
                    <th className="py-2.5 px-2 text-center w-20 ">COMPLETE %</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {metrics.map((item, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <tr
                        key={idx}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`transition-colors ${
                          isHovered
                            ? 'bg-secondary/70'
                            : idx % 2 === 0
                            ? 'bg-background'
                            : 'bg-muted/20'
                        }`}
                      >
                        {/* Client Name */}
                        <td className="py-2 px-3 font-bold text-foreground ">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate max-w-[120px]" title={item.clientName}>
                              {item.clientName}
                            </span>
                            {onDeleteClient && (
                              <button
                                type="button"
                                onClick={() => onDeleteClient(item.rawRow)}
                                className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 cursor-pointer"
                                title={`Delete ${item.clientName} from tracker`}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Editable Reels */}
                        <td className="py-2 px-2 text-center ">
                          <EditableNumber
                            value={item.reels}
                            onSave={(val) => onUpdatePlan?.(idx, val, item.posts)}
                          />
                        </td>

                        {/* Editable Posts */}
                        <td className="py-2 px-2 text-center ">
                          <EditableNumber
                            value={item.posts}
                            onSave={(val) => onUpdatePlan?.(idx, item.reels, val)}
                          />
                        </td>

                        {/* Editable Stories */}
                        <td className="py-2 px-2 text-center ">
                          <EditableNumber
                            value={item.stories}
                            onSave={(val) => onUpdateStories?.(idx, val)}
                          />
                        </td>

                        {/* Total Quota */}
                        <td className="py-2 px-2 text-center font-bold text-foreground ">
                          {item.total}
                        </td>

                        {/* Done */}
                        <td className="py-2 px-2 text-center font-bold text-foreground ">
                          {item.done}
                        </td>

                        {/* Pending */}
                        <td className="py-2 px-2 text-center font-semibold text-muted-foreground ">
                          {item.pending}
                        </td>

                        {/* Complete % */}
                        <td className="py-2 px-2 text-center font-black ">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              item.pct === 100
                                ? 'bg-primary text-primary-foreground'
                                : item.pct > 0
                                ? 'bg-secondary text-foreground font-bold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {item.pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow Callout Box */}
          <div className="bg-secondary/50 rounded-lg p-3 text-foreground">
            <p className="text-[11px] font-semibold leading-relaxed text-muted-foreground">
              <span className="font-bold tracking-wide text-foreground uppercase">WORKFLOW:</span>{' '}
              Plan row shows upload schedule → status row below it: select DONE → completion badge → percentage and chart update automatically
            </p>
          </div>
        </div>

        {/* ── Right Column: Bar Graph Visual ── */}
        <div className="xl:col-span-5 bg-card rounded-xl p-3 sm:p-4 flex flex-col overflow-hidden">
          <div className="w-full overflow-x-auto [touch-action:pan-x] [-webkit-overflow-scrolling:touch] custom-scrollbar">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full min-w-[280px] h-auto select-none"
              style={{ overflow: 'visible' }}
            >
              {/* Chart Title */}
              <text
                x={svgWidth / 2}
                y={20}
                textAnchor="middle"
                className="fill-foreground font-bold text-sm tracking-wide"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                Client Completion %
              </text>

              {/* Grid lines and Y-axis labels */}
              {ticks.map((t) => (
                <g key={t.pct}>
                  <line
                    x1={marginLeft}
                    y1={t.y}
                    x2={svgWidth - marginRight}
                    y2={t.y}
                    stroke={t.pct === 0 ? '#71717a' : t.pct === 100 ? '#a1a1aa' : '#d4d4d8'}
                    strokeWidth={t.pct === 0 ? 1.5 : 1}
                    strokeDasharray={t.pct === 0 || t.pct === 100 ? 'none' : '4 4'}
                    className="dark:stroke-zinc-700"
                  />
                  <text
                    x={marginLeft - 8}
                    y={t.y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground"
                    style={{ fontSize: 10, fontWeight: t.pct === 0 || t.pct === 100 ? 600 : 500 }}
                  >
                    {t.pct}%
                  </text>
                </g>
              ))}

              {/* Bars and X-Axis Labels */}
              {metrics.map((item, idx) => {
                const centerX = marginLeft + (idx + 0.5) * colWidth;
                const barHeight = (item.pct / 100) * plotHeight;
                const barY = baselineY - barHeight;
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Hover Column Background Highlight */}
                    {isHovered && (
                      <rect
                        x={centerX - colWidth / 2}
                        y={marginTop}
                        width={colWidth}
                        height={plotHeight}
                        fill="hsl(var(--secondary))"
                        fillOpacity="0.65"
                        rx="4"
                      />
                    )}

                    {/* Bar Rectangle */}
                    {item.pct > 0 && (
                      <rect
                        x={centerX - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        fill={isHovered ? '#12B7D4' : '#0EA5C6'}
                        rx="2"
                        style={{
                          transition: 'height 0.4s ease-out, y 0.4s ease-out, fill 0.2s',
                        }}
                      />
                    )}

                    {/* Completion % Label directly above Bar (if > 0%) */}
                    {item.pct > 0 && (
                      <text
                        x={centerX}
                        y={barY - 5}
                        textAnchor="middle"
                        className="fill-foreground"
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          transition: 'y 0.4s ease-out',
                        }}
                      >
                        {item.pct}%
                      </text>
                    )}

                    {/* Client Name Label Rotated at -45 Degrees */}
                    <text
                      x={centerX}
                      y={baselineY + 16}
                      transform={`rotate(-45, ${centerX}, ${baselineY + 16})`}
                      textAnchor="end"
                      className={isHovered ? 'fill-foreground font-bold' : 'fill-muted-foreground'}
                      style={{
                        fontSize: 10.5,
                        fontWeight: isHovered ? 800 : 600,
                        transition: 'fill 0.15s',
                      }}
                    >
                      {item.clientName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick Metrics Bar at bottom of chart */}
          <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground px-2 tabular-nums">
            <span>Clients: <strong className="text-foreground">{metrics.length}</strong></span>
            <span>Avg Completion: <strong className="text-foreground">{metrics.length > 0 ? Math.round(metrics.reduce((a,c)=>a+c.pct,0)/metrics.length) : 0}%</strong></span>
            <span className="text-foreground font-semibold">Total Done: {metrics.reduce((a,c)=>a+c.done,0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
