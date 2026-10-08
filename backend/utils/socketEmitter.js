// =============================================
// CENTRALIZED SOCKET EMITTER UTILITY
// =============================================

/**
 * Emits real-time live events to all connected clients.
 * Also emits to the generic 'crmLiveUpdate' stream for catch-all query invalidation.
 *
 * @param {string} event - The specific event name (e.g., 'smmTrackerCellUpdated', 'taskUpdated')
 * @param {object} payload - The data associated with the event
 */
export const emitLiveEvent = (event, payload = {}) => {
  try {
    if (global.io) {
      global.io.emit(event, payload);
      global.io.emit('crmLiveUpdate', {
        event,
        payload,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.error(`[SocketEmitter] Error emitting ${event}:`, err.message);
  }
};

export default emitLiveEvent;
