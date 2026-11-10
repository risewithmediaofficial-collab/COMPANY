/**
 * Normalize a DMVideoShoot checklist and target counts into separated Reels & Posts groups.
 * Preserves backward compatibility with legacy untyped checklists.
 */
export const normalizeShootChecklist = (shoot, { synthesizeDefaults = false } = {}) => {
  const rawList = Array.isArray(shoot?.checklist) ? shoot.checklist : [];
  const hasTypedItems = rawList.some((c) => c?.type === 'reel' || c?.type === 'post');
  const plannedReelsRaw = Number(shoot?.plannedReels || 0);
  const plannedPostsRaw = Number(shoot?.plannedPosts || 0);
  const plannedContentsRaw = Number(shoot?.plannedContents || 0);
  const contentType = shoot?.contentType || 'reels_and_posts';

  let items = [];

  if (rawList.length > 0) {
    if (hasTypedItems) {
      let rIdx = 0;
      let pIdx = 0;
      items = rawList.map((c, idx) => {
        const type = c.type === 'post' ? 'post' : 'reel';
        const seq = type === 'post' ? ++pIdx : ++rIdx;
        return {
          ...c,
          type,
          title: c.title || (type === 'post' ? `Post #${seq}` : `Reel Content #${seq}`),
          completed: Boolean(c.completed),
          _origIndex: idx,
        };
      });
    } else if (contentType === 'posts') {
      items = rawList.map((c, idx) => ({
        ...c,
        type: 'post',
        title: c.title || `Post #${idx + 1}`,
        completed: Boolean(c.completed),
        _origIndex: idx,
      }));
    } else if (contentType === 'reels') {
      items = rawList.map((c, idx) => ({
        ...c,
        type: 'reel',
        title: c.title || `Reel Content #${idx + 1}`,
        completed: Boolean(c.completed),
        _origIndex: idx,
      }));
    } else {
      // Legacy untyped checklist: allocate first N items to Reels based on plannedReels, remainder to Posts
      const reelSlice = plannedReelsRaw > 0 ? Math.min(plannedReelsRaw, rawList.length) : rawList.length;
      items = rawList.map((c, idx) => {
        const inferredType = idx < reelSlice ? 'reel' : 'post';
        const typeIndex = inferredType === 'reel' ? idx + 1 : idx - reelSlice + 1;
        return {
          ...c,
          type: inferredType,
          title: c.title || (inferredType === 'post' ? `Post #${typeIndex}` : `Reel Content #${typeIndex}`),
          completed: Boolean(c.completed),
          _origIndex: idx,
        };
      });
    }
  } else if (synthesizeDefaults && shoot) {
    const reelsNum = contentType === 'posts' ? 0 : plannedReelsRaw;
    const postsNum =
      contentType === 'reels'
        ? 0
        : plannedPostsRaw > 0
          ? plannedPostsRaw
          : contentType !== 'reels' && plannedContentsRaw > reelsNum
            ? Math.max(plannedContentsRaw - reelsNum, 0)
            : 0;

    for (let i = 1; i <= reelsNum; i++) {
      items.push({
        title: `Reel Content #${i}`,
        type: 'reel',
        completed: i <= Number(shoot.completedReels || 0),
        _origIndex: items.length,
      });
    }
    for (let i = 1; i <= postsNum; i++) {
      items.push({
        title: `Post #${i}`,
        type: 'post',
        completed: i <= Number(shoot.completedPosts || 0),
        _origIndex: items.length,
      });
    }
  }

  const reelItems = items.filter((c) => c.type === 'reel');
  const postItems = items.filter((c) => c.type === 'post');

  const targetReels = contentType === 'posts' ? 0 : plannedReelsRaw || reelItems.length;
  const legacyPostsFallback =
    !hasTypedItems && contentType !== 'reels' && plannedContentsRaw > targetReels
      ? Math.max(plannedContentsRaw - targetReels, postItems.length)
      : postItems.length;
  const targetPosts =
    contentType === 'reels' ? 0 : plannedPostsRaw > 0 ? plannedPostsRaw : legacyPostsFallback;

  const completedReels =
    reelItems.length > 0
      ? reelItems.filter((c) => c.completed).length
      : Number(shoot?.completedReels || 0);
  const completedPosts =
    postItems.length > 0
      ? postItems.filter((c) => c.completed).length
      : Number(shoot?.completedPosts || 0);

  const reelsPct = targetReels > 0 ? Math.round((completedReels / targetReels) * 100) : 0;
  const postsPct = targetPosts > 0 ? Math.round((completedPosts / targetPosts) * 100) : 0;

  const isReelsMet = targetReels > 0 && completedReels >= targetReels;
  const isPostsMet = targetPosts > 0 && completedPosts >= targetPosts;

  const showReels = contentType === 'reels' || reelItems.length > 0 || targetReels > 0;
  const showPosts = contentType === 'posts' || postItems.length > 0 || targetPosts > 0;

  return {
    items,
    reelItems,
    postItems,
    targetReels,
    targetPosts,
    completedReels,
    completedPosts,
    reelsPct,
    postsPct,
    isReelsMet,
    isPostsMet,
    showReels,
    showPosts,
    hasTypedItems,
  };
};

export const stripChecklistMeta = (items = []) =>
  items.map(({ _origIndex, ...rest }) => rest);

