// =============================================
// CENTRALIZED SOCKET EMITTER UTILITY
// =============================================

/**
 * Emits real-time live events to authorized rooms (project, brand/workspace, organization, user, and crm staff).
 * Minimizes broadcast payloads to prevent tenant/cross-client data leakage.
 *
 * @param {string} event - The specific event name (e.g., 'taskUpdated', 'clientCreated')
 * @param {object} payload - The data associated with the event
 * @param {object} options - Scope options: { projectId, brandId, workspaceId, organizationId, userId, isPrivateUserOnly }
 */
export const emitLiveEvent = (event, payload = {}, options = {}) => {
  try {
    const io = global.io;
    if (!io) return;

    // Minimize payload for catch-all stream to prevent leaking full tenant records
    const entityId =
      payload?._id?.toString() ||
      payload?.id?.toString() ||
      payload?.taskId?.toString() ||
      payload?.projectId?.toString() ||
      payload?.clientId?.toString() ||
      payload?.trackerId?.toString();

    const minimalPayload = {
      event,
      id: entityId,
      ...(payload?.status ? { status: payload.status } : {}),
      ...(payload?.month ? { month: payload.month } : {}),
      ...(payload?.year ? { year: payload.year } : {}),
      timestamp: Date.now(),
    };

    const targetProjectId = options.projectId || payload?.project?._id || payload?.project || payload?.projectId;
    const targetBrandId = options.brandId || options.workspaceId || payload?.brandId;
    const targetUserId = options.userId;
    const targetOrgId = options.organizationId || payload?.organizationId;

    const targetRooms = new Set();

    // 1. Staff room: unless explicitly restricted to a private user, all CRM staff receive live updates
    if (!options.isPrivateUserOnly) {
      targetRooms.add('crm');
    }

    // 2. Specific user room if targeted (e.g. employee, client, or manager)
    if (targetUserId) {
      targetRooms.add(`user:${targetUserId.toString()}`);
    }

    // 3. Project room (for project detail viewers & clients assigned to that project)
    if (targetProjectId) {
      targetRooms.add(`project:${targetProjectId.toString()}`);
    }

    // 4. Brand / Workspace room
    if (targetBrandId) {
      targetRooms.add(`brand:${targetBrandId.toString()}`);
    }

    // 5. Organization room
    if (targetOrgId) {
      targetRooms.add(`org:${targetOrgId.toString()}`);
    }

    // Deliver to all targeted rooms
    targetRooms.forEach((room) => {
      io.to(room).emit(event, payload);
      io.to(room).emit('crmLiveUpdate', minimalPayload);
    });
  } catch (err) {
    console.error(`[SocketEmitter] Error emitting ${event}:`, err.message);
  }
};

export default emitLiveEvent;
