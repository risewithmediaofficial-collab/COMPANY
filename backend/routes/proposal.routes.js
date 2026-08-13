// =============================================
// PROPOSAL ROUTES
// =============================================

import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import Proposal from '../models/proposal.model.js';
import Client from '../models/client.model.js';
import Notification from '../models/notification.model.js';

const router = express.Router();

const isAdmin = (user) => user.role === 'superAdmin' || user.role === 'admin';
const canManageProposals = (user) => ['superAdmin', 'admin', 'manager'].includes(user.role) || Boolean(user.permissions?.canManageFinance);

const getClientRecordForUser = async (user) => {
  if (user.role !== 'client') return null;
  return Client.findOne({ userId: user._id }).select('_id name');
};

router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    const { client, status } = req.query;
    const query = {};

    if (user.organizationId) query.organizationId = user.organizationId;
    if (client) query.client = client;
    if (status) query.status = status;

    if (isAdmin(user)) {
      // all proposals
    } else if (user.role === 'manager') {
      query.createdBy = user._id;
    } else if (user.role === 'client') {
      const clientRecord = await getClientRecordForUser(user);
      if (!clientRecord) {
        return res.json({ success: true, proposals: [] });
      }
      query.client = clientRecord._id;
      query.status = { $in: ['sent', 'viewed', 'accepted', 'rejected'] };
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized to view proposals' });
    }

    const proposals = await Proposal.find(query)
      .populate('client', 'name email phone company')
      .populate('createdBy', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/client/:clientId', protect, async (req, res) => {
  try {
    if (!canManageProposals(req.user) && req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const proposals = await Proposal.find({
      client: req.params.clientId,
      ...(req.user.organizationId ? { organizationId: req.user.organizationId } : {}),
    })
      .populate('client', 'name email phone company')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/client/:clientId/accepted', protect, async (req, res) => {
  try {
    const proposals = await Proposal.find({
      client: req.params.clientId,
      status: 'accepted',
      ...(req.user.organizationId ? { organizationId: req.user.organizationId } : {}),
    })
      .populate('client', 'name email phone company')
      .populate('createdBy', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ acceptedAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('client', 'name email phone company')
      .populate('createdBy', 'name email')
      .populate('acceptedBy', 'name email');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const user = req.user;

    if (!canManageProposals(user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create proposal' });
    }

    const proposal = await Proposal.create({
      organizationId: user.organizationId,
      brandId: user.brandId,
      createdBy: user._id,
      currency: 'INR',
      status: 'draft',
      ...req.body,
    });

    await proposal.populate('client', 'name email phone company');
    await proposal.populate('createdBy', 'name email');

    res.status(201).json({ success: true, message: 'Proposal created successfully', proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (!isAdmin(user) && proposal.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update proposal' });
    }

    Object.assign(proposal, req.body, { updatedBy: user._id });
    await proposal.save();
    await proposal.populate(['client', 'createdBy'], 'name email phone company');

    res.json({ success: true, message: 'Proposal updated successfully', proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/accept', protect, async (req, res) => {
  try {
    const user = req.user;
    const proposal = await Proposal.findById(req.params.id).populate('client', 'name company');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (user.role === 'client') {
      const clientRecord = await getClientRecordForUser(user);
      if (!clientRecord || proposal.client._id.toString() !== clientRecord._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to accept this proposal' });
      }
    } else if (!canManageProposals(user)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    proposal.status = 'accepted';
    proposal.acceptedAt = new Date();
    proposal.acceptedBy = user._id;
    await proposal.save();

    if (proposal.createdBy) {
      await Notification.create({
        organizationId: user.organizationId,
        recipient: proposal.createdBy,
        type: 'proposal_accepted',
        title: 'Proposal Accepted',
        message: `${proposal.client?.name || proposal.client?.company || 'Client'} accepted proposal: ${proposal.title}`,
        referenceId: proposal._id,
        metadata: {
          proposalId: proposal._id,
          clientId: proposal.client?._id,
          amount: proposal.amount,
          acceptedDate: proposal.acceptedAt,
        },
      });
    }

    await proposal.populate(['client', 'createdBy', 'acceptedBy'], 'name email phone company');

    res.json({ success: true, message: 'Proposal accepted successfully', proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/reject', protect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    proposal.status = 'rejected';
    proposal.rejectedAt = new Date();
    await proposal.save();

    res.json({ success: true, message: 'Proposal rejected', proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can delete proposals' });
    }

    const proposal = await Proposal.findByIdAndDelete(req.params.id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
