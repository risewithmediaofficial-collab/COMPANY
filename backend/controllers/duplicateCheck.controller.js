import mongoose from 'mongoose';
import Expense from '../models/expense.model.js';
import Invoice from '../models/invoice.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import Lead from '../models/lead.model.js';
import Task from '../models/task.model.js';

const escapeRegex = (string = '') => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Check if a similar record already exists before saving
 * @route POST /api/check-duplicate
 */
export const checkDuplicateRecord = async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.json({ success: true, isDuplicate: false });
    }

    const normalizedType = String(type).toLowerCase().trim();

    // ── 1. EXPENSE DUPLICATE CHECK ───────────────────────────
    if (normalizedType === 'expense') {
      const title = (data.title || '').trim();
      const amount = Number(data.amount);

      if (title && !isNaN(amount) && amount > 0) {
        // Look back 60 days for an expense with identical or near-identical title & amount
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600000);
        const match = await Expense.findOne({
          title: { $regex: new RegExp(`^${escapeRegex(title)}$`, 'i') },
          amount,
          createdAt: { $gte: sixtyDaysAgo },
        }).populate('client', 'name company');

        if (match) {
          const formattedDate = new Date(match.date || match.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          return res.json({
            success: true,
            isDuplicate: true,
            message: `An expense titled "${match.title}" with amount ₹${match.amount.toLocaleString('en-IN')} was already recorded on ${formattedDate}.`,
            existingRecord: {
              _id: match._id,
              title: match.title,
              amount: match.amount,
              date: match.date || match.createdAt,
              category: match.category,
              clientName: match.client?.company || match.client?.name || '',
            },
          });
        }
      }
    }

    // ── 2. INVOICE DUPLICATE CHECK ───────────────────────────
    if (normalizedType === 'invoice') {
      const { client, servicePeriod, invoiceNumber } = data;

      // Check duplicate invoice number if provided
      if (invoiceNumber && String(invoiceNumber).trim()) {
        const matchNum = await Invoice.findOne({
          invoiceNumber: { $regex: new RegExp(`^${escapeRegex(String(invoiceNumber).trim())}$`, 'i') },
        }).populate('client', 'name company');

        if (matchNum) {
          return res.json({
            success: true,
            isDuplicate: true,
            message: `Invoice number "${matchNum.invoiceNumber}" already exists for ${matchNum.client?.company || matchNum.client?.name || 'a client'}.`,
            existingRecord: matchNum,
          });
        }
      }

      // Check same client & service period
      if (client && servicePeriod && String(servicePeriod).trim()) {
        const matchPeriod = await Invoice.findOne({
          client,
          servicePeriod: { $regex: new RegExp(`^${escapeRegex(String(servicePeriod).trim())}$`, 'i') },
        }).populate('client', 'name company');

        if (matchPeriod) {
          return res.json({
            success: true,
            isDuplicate: true,
            message: `An invoice for ${matchPeriod.client?.company || matchPeriod.client?.name} for the period "${matchPeriod.servicePeriod}" already exists (${matchPeriod.invoiceNumber} • ₹${(matchPeriod.total || 0).toLocaleString('en-IN')}).`,
            existingRecord: matchPeriod,
          });
        }
      }
    }

    // ── 3. CLIENT DUPLICATE CHECK ────────────────────────────
    if (normalizedType === 'client') {
      const name = (data.name || data.company || '').trim();
      const phone = (data.phone || '').trim();
      const email = (data.email || '').trim().toLowerCase();

      const orConditions = [];
      if (name.length >= 2) {
        orConditions.push({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } });
        orConditions.push({ company: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } });
      }
      if (phone.length >= 8) {
        orConditions.push({ phone: { $regex: escapeRegex(phone.slice(-10)) } });
      }
      if (email.length >= 4) {
        orConditions.push({ email });
      }

      if (orConditions.length > 0) {
        const matchClient = await Client.findOne({ $or: orConditions });
        if (matchClient) {
          const fieldMatched = matchClient.email === email ? 'Email' : matchClient.phone === phone ? 'Phone' : 'Company Name';
          return res.json({
            success: true,
            isDuplicate: true,
            message: `Client "${matchClient.company || matchClient.name}" already exists (${fieldMatched} matches an existing client).`,
            existingRecord: {
              _id: matchClient._id,
              name: matchClient.name,
              company: matchClient.company,
              email: matchClient.email,
              phone: matchClient.phone,
            },
          });
        }
      }
    }

    // ── 4. PROJECT DUPLICATE CHECK ───────────────────────────
    if (normalizedType === 'project') {
      const name = (data.name || '').trim();
      const client = data.client;

      if (name.length >= 2) {
        const query = {
          name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
        };
        if (client) query.client = client;

        const matchProject = await Project.findOne(query).populate('client', 'name company');
        if (matchProject) {
          return res.json({
            success: true,
            isDuplicate: true,
            message: `A project named "${matchProject.name}" already exists${matchProject.client ? ` under ${matchProject.client.company || matchProject.client.name}` : ''}.`,
            existingRecord: {
              _id: matchProject._id,
              name: matchProject.name,
              clientName: matchProject.client?.company || matchProject.client?.name || '',
            },
          });
        }
      }
    }

    // ── 5. LEAD DUPLICATE CHECK ──────────────────────────────
    if (normalizedType === 'lead') {
      const name = (data.name || '').trim();
      const phone = (data.phone || '').trim();
      const email = (data.email || '').trim().toLowerCase();

      const orConditions = [];
      if (email.length >= 4) orConditions.push({ email });
      if (phone.length >= 8) orConditions.push({ phone: { $regex: escapeRegex(phone.slice(-10)) } });
      if (name.length >= 3) orConditions.push({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } });

      if (orConditions.length > 0) {
        const matchLead = await Lead.findOne({ $or: orConditions });
        if (matchLead) {
          return res.json({
            success: true,
            isDuplicate: true,
            message: `A lead named "${matchLead.name}" already exists (${matchLead.phone || matchLead.email || 'same name'}).`,
            existingRecord: {
              _id: matchLead._id,
              name: matchLead.name,
              email: matchLead.email,
              phone: matchLead.phone,
            },
          });
        }
      }
    }

    // ── 6. TASK DUPLICATE CHECK ──────────────────────────────
    if (normalizedType === 'task') {
      const title = (data.title || '').trim();
      const project = data.project;

      if (title.length >= 3 && project) {
        const matchTask = await Task.findOne({
          title: { $regex: new RegExp(`^${escapeRegex(title)}$`, 'i') },
          project,
        });

        if (matchTask) {
          return res.json({
            success: true,
            isDuplicate: true,
            message: `A task titled "${matchTask.title}" already exists in this project.`,
            existingRecord: {
              _id: matchTask._id,
              title: matchTask.title,
              status: matchTask.status,
            },
          });
        }
      }
    }

    // Default: No duplicates found
    return res.json({ success: true, isDuplicate: false });
  } catch (error) {
    console.error('checkDuplicateRecord error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
