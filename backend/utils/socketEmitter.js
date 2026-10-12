// =============================================
// CENTRALIZED SOCKET EMITTER UTILITY
// =============================================

/**
 * Emits real-time live events to authorized rooms (project, brand/workspace, organization, user, or crm).
 * Minimizes broadcast payloads to prevent tenant/cross-client data leakage.
 *
 * @param {string} event - The specific event name (e.g., 'taskUpdated', 'clientCreated')
 * @param {object} payload - The data associated with the event
 * @param {object} options - Scope options: { projectId, brandId, workspaceId, organizationId, userId, isCRMOnly }
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

    const targetProjectId = options.projectId || payload?.project || payload?.projectId;
    const targetBrandId = options.brandId || options.workspaceId || payload?.brandId;
    const targetUserId = options.userId;
    const targetOrgId = options.organizationId || payload?.organizationId;

    const targetRooms = [];

    if (targetUserId) {
      targetRooms.push(`user:${targetUserId}`);
    } else if (targetProjectId) {
      targetRooms.push(`project:${targetProjectId}`);
    } else if (targetBrandId) {
      targetRooms.push(`brand:${targetBrandId}`);
    } else if (targetOrgId) {
      targetRooms.push(`org:${targetOrgId}`);
    } else {
      // Default to CRM staff room rather than global unauthenticated broadcast
      targetRooms.push('crm');
    }

    targetRooms.forEach((room) => {
      io.to(room).emit(event, payload);
      io.to(room).emit('crmLiveUpdate', minimalPayload);
    });
  } catch (err) {
    console.error(`[SocketEmitter] Error emitting ${event}:`, err.message);
  }
};

export default emitLiveEvent;

