// =============================================
// PAGINATION UTILITY & CLAMPING ENGINE
// =============================================

/**
 * Validate and clamp standard page/limit pagination parameters
 * @param {Object} query - req.query
 * @param {Object} options - { defaultLimit, maxLimit, defaultPage }
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePagination = (query = {}, options = {}) => {
  const {
    defaultLimit = 25,
    maxLimit = 100,
    defaultPage = 1,
  } = options;

  let page = defaultPage;
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      const err = new Error('Invalid page parameter: must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    page = parsedPage;
  }

  let limit = defaultLimit;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      const err = new Error('Invalid limit parameter: must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    // Clamp to maxLimit
    limit = Math.min(parsedLimit, maxLimit);
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Validate and extract cursor-based pagination
 * @param {Object} query - req.query
 * @param {Object} options - { defaultLimit, maxLimit }
 * @returns {{ cursor: string|null, limit: number }}
 */
export const parseCursorPagination = (query = {}, options = {}) => {
  const { defaultLimit = 25, maxLimit = 100 } = options;

  let limit = defaultLimit;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      const err = new Error('Invalid limit parameter: must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    limit = Math.min(parsedLimit, maxLimit);
  }

  const cursor = query.cursor ? String(query.cursor).trim() : null;

  return { cursor, limit };
};
