// =============================================
// EOD REPORTS EXPORT CONTROLLER
// Generates DOCX exports of EOD reports
// =============================================
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
} from 'docx';
import Attendance from '../models/attendance.model.js';

// ── Helper: format date nicely ──────────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

// ── Shared DOCX styling constants ───────────────────────────────────────────
const BRAND_COLOR = '4F46E5'; // Indigo-600
const BRAND_LIGHT = 'EEF2FF'; // Indigo-50
const BORDER_COLOR = 'D1D5DB';
const TEXT_DARK = '111827';
const TEXT_MUTED = '6B7280';
const GREEN = '059669';
const AMBER = 'D97706';

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
};

// ── Build a single EOD day section ──────────────────────────────────────────
const buildDaySection = (record, index) => {
  const eod = record.eodReport || {};
  const dateStr = fmtDate(record.date);
  const submittedTime = eod.submittedAt ? fmtTime(eod.submittedAt) : '—';
  const tasks = eod.tasksCompleted || [];

  const elements = [];

  // Day header
  elements.push(
    new Paragraph({
      spacing: { before: index > 0 ? 360 : 0, after: 120 },
      children: [
        new TextRun({
          text: `📅 ${dateStr}`,
          bold: true,
          size: 26,
          color: BRAND_COLOR,
          font: 'Calibri',
        }),
        new TextRun({
          text: `    ⏱ Submitted at ${submittedTime}`,
          size: 18,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    })
  );

  // Attendance status + hours
  const statusLabel =
    (record.status || 'present').replace(/_/g, ' ').toUpperCase();
  const hours = record.totalHours
    ? `${record.totalHours.toFixed(1)} hrs`
    : '—';

  elements.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Status: ${statusLabel}  •  Hours: ${hours}`,
          size: 18,
          color: TEXT_MUTED,
          font: 'Calibri',
          italics: true,
        }),
      ],
    })
  );

  // Summary
  if (eod.summary) {
    elements.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'Summary',
            bold: true,
            size: 20,
            color: TEXT_DARK,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 240 },
        children: [
          new TextRun({
            text: eod.summary,
            size: 20,
            color: TEXT_DARK,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Tasks completed
  if (tasks.length > 0) {
    elements.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Completed Tasks (${tasks.length})`,
            bold: true,
            size: 20,
            color: GREEN,
            font: 'Calibri',
          }),
        ],
      })
    );

    tasks.forEach((task, tIdx) => {
      elements.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: `✓ `,
              bold: true,
              size: 20,
              color: GREEN,
              font: 'Calibri',
            }),
            new TextRun({
              text: task,
              size: 20,
              color: TEXT_DARK,
              font: 'Calibri',
            }),
          ],
        })
      );
    });
  }

  // Blockers
  if (eod.blockers) {
    elements.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({
            text: '⚠ Blockers',
            bold: true,
            size: 20,
            color: AMBER,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 240 },
        children: [
          new TextRun({
            text: eod.blockers,
            size: 20,
            color: TEXT_DARK,
            font: 'Calibri',
            italics: true,
          }),
        ],
      })
    );
  } else {
    elements.push(
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({
            text: '✅ No blockers reported',
            size: 18,
            color: GREEN,
            font: 'Calibri',
            italics: true,
          }),
        ],
      })
    );
  }

  // Divider line
  elements.push(
    new Paragraph({
      spacing: { after: 80 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      },
      children: [new TextRun({ text: '', size: 8 })],
    })
  );

  return elements;
};

// ── Build summary table for multi-day exports ───────────────────────────────
const buildSummaryTable = (records) => {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Date', 'Status', 'Hours', 'Tasks', 'Blockers?'].map(
      (label) =>
        new TableCell({
          borders: thinBorder,
          shading: { type: ShadingType.SOLID, color: BRAND_COLOR },
          width: { size: label === 'Date' ? 22 : label === 'Tasks' ? 30 : 16, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = records.map(
    (r, idx) =>
      new TableRow({
        children: [
          // Date
          new TableCell({
            borders: thinBorder,
            shading:
              idx % 2 === 0
                ? { type: ShadingType.SOLID, color: BRAND_LIGHT }
                : undefined,
            children: [
              new Paragraph({
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: fmtDateShort(r.date),
                    size: 18,
                    font: 'Calibri',
                    color: TEXT_DARK,
                  }),
                ],
              }),
            ],
          }),
          // Status
          new TableCell({
            borders: thinBorder,
            shading:
              idx % 2 === 0
                ? { type: ShadingType.SOLID, color: BRAND_LIGHT }
                : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: (r.status || 'present').replace(/_/g, ' '),
                    size: 18,
                    font: 'Calibri',
                    color: TEXT_DARK,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          // Hours
          new TableCell({
            borders: thinBorder,
            shading:
              idx % 2 === 0
                ? { type: ShadingType.SOLID, color: BRAND_LIGHT }
                : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: r.totalHours ? `${r.totalHours.toFixed(1)}h` : '—',
                    size: 18,
                    font: 'Calibri',
                    color: TEXT_DARK,
                  }),
                ],
              }),
            ],
          }),
          // Tasks count
          new TableCell({
            borders: thinBorder,
            shading:
              idx % 2 === 0
                ? { type: ShadingType.SOLID, color: BRAND_LIGHT }
                : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: `${r.eodReport?.tasksCompleted?.length || 0}`,
                    size: 18,
                    font: 'Calibri',
                    color: GREEN,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          // Blockers
          new TableCell({
            borders: thinBorder,
            shading:
              idx % 2 === 0
                ? { type: ShadingType.SOLID, color: BRAND_LIGHT }
                : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({
                    text: r.eodReport?.blockers ? 'Yes' : 'No',
                    size: 18,
                    font: 'Calibri',
                    color: r.eodReport?.blockers ? AMBER : GREEN,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/attendance/eod-reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD&range=weekly|monthly
// ═══════════════════════════════════════════════════════════════════════════════
export const exportEodReportsDocx = async (req, res) => {
  try {
    const { from, to, range } = req.query;
    const userId = req.user._id;
    const userName = req.user.name || 'Employee';

    // Determine date range
    let startDate, endDate;
    const now = new Date();

    if (from && to) {
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'weekly') {
      // Current week (Mon-Sun)
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + diffToMon);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'monthly') {
      // Current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Default: last 7 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch records
    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
      'eodReport.submittedAt': { $exists: true },
    })
      .populate('user', 'name email department position role')
      .sort({ date: 1 })
      .lean();

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No EOD reports found for the selected date range.',
      });
    }

    // Compute stats
    const totalTasks = records.reduce(
      (sum, r) => sum + (r.eodReport?.tasksCompleted?.length || 0),
      0
    );
    const totalHours = records.reduce(
      (sum, r) => sum + (r.totalHours || 0),
      0
    );
    const daysWithBlockers = records.filter(
      (r) => r.eodReport?.blockers
    ).length;

    const rangeLabel = `${fmtDateShort(startDate)} — ${fmtDateShort(endDate)}`;
    const typeLabel =
      range === 'weekly'
        ? 'Weekly'
        : range === 'monthly'
        ? 'Monthly'
        : 'Custom';

    // ── Build DOCX ────────────────────────────────────────────────────────────
    const docChildren = [];

    // Title
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'END OF DAY REPORTS',
            bold: true,
            size: 36,
            color: BRAND_COLOR,
            font: 'Calibri',
          }),
        ],
      })
    );

    // Subtitle
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `${typeLabel} Report  •  ${rangeLabel}`,
            size: 22,
            color: TEXT_MUTED,
            font: 'Calibri',
          }),
        ],
      })
    );

    // Employee info
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `Employee: ${userName}`,
            bold: true,
            size: 22,
            color: TEXT_DARK,
            font: 'Calibri',
          }),
          new TextRun({
            text: `  •  Generated: ${fmtDate(new Date())}`,
            size: 18,
            color: TEXT_MUTED,
            font: 'Calibri',
          }),
        ],
      })
    );

    // Stats bar
    docChildren.push(
      new Paragraph({
        spacing: { after: 40 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 2, color: BRAND_COLOR },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: BRAND_COLOR },
        },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `📊 ${records.length} Reports  •  ✅ ${totalTasks} Tasks  •  ⏱ ${totalHours.toFixed(1)} Hours  •  ⚠ ${daysWithBlockers} Days with Blockers`,
            bold: true,
            size: 20,
            color: BRAND_COLOR,
            font: 'Calibri',
          }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({ spacing: { after: 200 }, children: [] })
    );

    // Summary table
    docChildren.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: '📋 Overview Table',
            bold: true,
            size: 24,
            color: TEXT_DARK,
            font: 'Calibri',
          }),
        ],
      })
    );

    docChildren.push(buildSummaryTable(records));

    docChildren.push(
      new Paragraph({ spacing: { after: 300 }, children: [] })
    );

    // Detailed day-by-day
    docChildren.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: '📝 Detailed Day-by-Day Reports',
            bold: true,
            size: 26,
            color: TEXT_DARK,
            font: 'Calibri',
          }),
        ],
      })
    );

    records.forEach((record, idx) => {
      docChildren.push(...buildDaySection(record, idx));
    });

    // Footer
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: '— End of Report —',
            italics: true,
            size: 18,
            color: TEXT_MUTED,
            font: 'Calibri',
          }),
        ],
      })
    );

    const doc = new Document({
      creator: 'Rise With Media CRM',
      title: `EOD Report - ${userName} - ${rangeLabel}`,
      description: `${typeLabel} EOD Report for ${userName}`,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const safeFileName = `EOD_Report_${userName.replace(/\s+/g, '_')}_${
      startDate.toISOString().split('T')[0]
    }_to_${endDate.toISOString().split('T')[0]}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"`
    );
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error('exportEodReportsDocx error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to export report', error: err.message });
  }
};
