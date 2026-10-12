// =============================================
// TICKET CONTROLLER - Support Tickets
// =============================================

import Ticket from '../models/ticket.model.js';
import Client from '../models/client.model.js';
import { parsePagination } from '../utils/pagination.js';

export const getTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (req.user.role === 'client') {
      const client = await Client.findOne({ userId: req.user._id });
      if (client) filter.client = client._id;
    }

    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter)
        .populate('client', 'name email')
        .populate('submittedBy', 'name avatar')
        .populate('assignedTo', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), tickets });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email')
      .populate('submittedBy', 'name avatar')
      .populate('assignedTo', 'name avatar')
      .populate('replies.author', 'name avatar role');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTicket = async (req, res) => {
  try {
    let clientId = req.body.client;
    if (req.user.role === 'client') {
      const client = await Client.findOne({ userId: req.user._id });
      if (client) clientId = client._id;
    }
    const ticket = await Ticket.create({ ...req.body, client: clientId, submittedBy: req.user._id });
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const replyTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    ticket.replies.push({ content: req.body.content, author: req.user._id, isInternal: req.body.isInternal || false });
    if (req.body.status) ticket.status = req.body.status;
    await ticket.save();

    const updated = await Ticket.findById(ticket._id).populate('replies.author', 'name avatar role');
    res.json({ success: true, ticket: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
