import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import DMVideoShoot, { applyVideoShootCalculations } from '../models/dmVideoShoot.model.js';
import { normalizeShootChecklist, stripChecklistMeta } from '../../frontend/src/utils/dmChecklist.js';

const baseShootFields = () => ({
  client: new mongoose.Types.ObjectId(),
  shootTitle: 'Festive Shoot Campaign',
  shootDate: new Date('2026-11-15T00:00:00Z'),
  startTime: new Date('2026-11-15T09:00:00Z'),
  endTime: new Date('2026-11-15T13:00:00Z'),
  createdBy: new mongoose.Types.ObjectId(),
});

test('DMVideoShoot Model: reels_and_posts tracks Reels and Posts completion separately', async () => {
  const doc = new DMVideoShoot({
    ...baseShootFields(),
    contentType: 'reels_and_posts',
    plannedReels: 4,
    plannedPosts: 2,
    checklist: [
      { title: 'Reel 1', type: 'reel', completed: true },
      { title: 'Reel 2', type: 'reel', completed: true },
      { title: 'Reel 3', type: 'reel', completed: false },
      { title: 'Reel 4', type: 'reel', completed: false },
      { title: 'Post 1', type: 'post', completed: true },
      { title: 'Post 2', type: 'post', completed: false },
    ],
  });

  await doc.validate();
  applyVideoShootCalculations(doc);

  assert.equal(doc.plannedContents, 6);
  assert.equal(doc.completedContents, 3);
  assert.equal(doc.contentsCompletionPct, 50);

  assert.equal(doc.completedReels, 2);
  assert.equal(doc.reelsCompletionPct, 50);

  assert.equal(doc.completedPosts, 1);
  assert.equal(doc.postsCompletionPct, 50);
  assert.equal(doc.duration, 4);
});

test('DMVideoShoot Model: contentType "reels" zeroes plannedPosts and "posts" zeroes plannedReels', async () => {
  const reelsOnly = new DMVideoShoot({
    ...baseShootFields(),
    contentType: 'reels',
    plannedReels: 5,
    plannedPosts: 4, // should be forced to 0
    checklist: [
      { title: 'Reel 1', type: 'reel', completed: true },
      { title: 'Reel 2', type: 'reel', completed: true },
    ],
  });

  await reelsOnly.validate();
  applyVideoShootCalculations(reelsOnly);

  assert.equal(reelsOnly.plannedPosts, 0);
  assert.equal(reelsOnly.plannedContents, 5);
  assert.equal(reelsOnly.completedReels, 2);
  assert.equal(reelsOnly.completedPosts, 0);
  assert.equal(reelsOnly.reelsCompletionPct, 40);

  const postsOnly = new DMVideoShoot({
    ...baseShootFields(),
    contentType: 'posts',
    plannedReels: 3, // should be forced to 0
    plannedPosts: 5,
    checklist: [
      { title: 'Post 1', type: 'post', completed: true },
      { title: 'Post 2', type: 'post', completed: false },
    ],
  });

  await postsOnly.validate();
  applyVideoShootCalculations(postsOnly);

  assert.equal(postsOnly.plannedReels, 0);
  assert.equal(postsOnly.plannedContents, 5);
  assert.equal(postsOnly.completedPosts, 1);
  assert.equal(postsOnly.completedReels, 0);
  assert.equal(postsOnly.postsCompletionPct, 20);
});

test('DMVideoShoot Model: preserves legacy plannedContents when toggling untyped checklist items', () => {
  const legacyDoc = DMVideoShoot.hydrate({
    _id: new mongoose.Types.ObjectId(),
    ...baseShootFields(),
    plannedContents: 10,
    plannedReels: 5,
    checklist: Array.from({ length: 10 }, (_, idx) => ({
      title: `Item #${idx + 1}`,
      completed: idx < 3,
    })),
  });

  // Untyped legacy checklist items should not silently receive type='reel' on hydrate
  assert.equal(legacyDoc.checklist[7].type, undefined);

  // Toggle an item without touching plannedReels/plannedPosts/contentType
  legacyDoc.checklist[3].completed = true;
  applyVideoShootCalculations(legacyDoc);

  assert.equal(legacyDoc.plannedContents, 10);
  assert.equal(legacyDoc.completedContents, 4);
  assert.equal(legacyDoc.completedReels, 4);
  assert.equal(legacyDoc.contentsCompletionPct, 40);
});

test('DMChecklist Util: cleanly separates typed Reels and Posts and partitions legacy checklists', () => {
  const typedShoot = {
    contentType: 'reels_and_posts',
    plannedReels: 3,
    plannedPosts: 2,
    checklist: [
      { title: 'Reel Hook', type: 'reel', completed: true },
      { title: 'Post Carousel', type: 'post', completed: true },
      { title: 'Reel BTS', type: 'reel', completed: false },
      { title: 'Post Static', type: 'post', completed: false },
    ],
  };

  const typed = normalizeShootChecklist(typedShoot);
  assert.equal(typed.reelItems.length, 2);
  assert.equal(typed.postItems.length, 2);
  assert.equal(typed.reelItems[0]._origIndex, 0);
  assert.equal(typed.postItems[0]._origIndex, 1);
  assert.equal(typed.completedReels, 1);
  assert.equal(typed.completedPosts, 1);
  assert.equal(typed.targetReels, 3);
  assert.equal(typed.targetPosts, 2);
  assert.equal(typed.showReels, true);
  assert.equal(typed.showPosts, true);

  const stripped = stripChecklistMeta(typed.items);
  assert.equal('_origIndex' in stripped[0], false);

  // Legacy shoot without item types
  const legacyShoot = {
    contentType: 'reels_and_posts',
    plannedContents: 10,
    plannedReels: 5,
    plannedPosts: 0,
    checklist: Array.from({ length: 10 }, (_, idx) => ({
      title: `Legacy #${idx + 1}`,
      completed: idx < 6,
    })),
  };

  const legacy = normalizeShootChecklist(legacyShoot);
  assert.equal(legacy.hasTypedItems, false);
  assert.equal(legacy.reelItems.length, 5);
  assert.equal(legacy.postItems.length, 5);
  assert.equal(legacy.completedReels, 5);
  assert.equal(legacy.completedPosts, 1);
  assert.equal(legacy.targetReels, 5);
  assert.equal(legacy.targetPosts, 5);
  assert.equal(legacy.isReelsMet, true);
  assert.equal(legacy.isPostsMet, false);
});

test('DMVideoShoot & DMChecklist: handles streamlined Post schedule with equal timestamps and multiple editable titles', async () => {
  const postDateMarker = new Date('2026-11-18T09:00:00Z');
  const postSchedule = new DMVideoShoot({
    client: new mongoose.Types.ObjectId(),
    contentType: 'posts',
    shootTitle: 'Diwali Offer Poster (+2 more)',
    shootDate: new Date('2026-11-18T00:00:00Z'),
    startTime: postDateMarker,
    endTime: postDateMarker,
    shootLocation: '',
    plannedReels: 0,
    plannedPosts: 3,
    checklist: [
      { title: 'Diwali Offer Poster', type: 'post', completed: false },
      { title: 'Carousel Feature Tips', type: 'post', completed: true },
      { title: 'Weekend Story Graphic', type: 'post', completed: false },
    ],
    notes: 'Use gold brand palette and client logo in top right.',
    createdBy: new mongoose.Types.ObjectId(),
  });

  await postSchedule.validate();
  applyVideoShootCalculations(postSchedule);

  assert.equal(postSchedule.duration, 0);
  assert.equal(postSchedule.plannedReels, 0);
  assert.equal(postSchedule.plannedPosts, 3);
  assert.equal(postSchedule.plannedContents, 3);
  assert.equal(postSchedule.completedPosts, 1);

  const normalized = normalizeShootChecklist(postSchedule.toObject());
  assert.equal(normalized.showReels, false);
  assert.equal(normalized.showPosts, true);
  assert.equal(normalized.postItems.length, 3);
  assert.equal(normalized.postItems[1].title, 'Carousel Feature Tips');
});

test('Module Integrity: DM Calendar controller exports expected handlers', async () => {
  const ctrl = await import('../controllers/dmCalendar.controller.js');
  assert.equal(typeof ctrl.getVideoShoots, 'function');
  assert.equal(typeof ctrl.createVideoShoot, 'function');
  assert.equal(typeof ctrl.updateVideoShoot, 'function');
  assert.equal(typeof ctrl.getDMDashboardSummary, 'function');
  assert.equal(typeof ctrl.getDMClientPerformance, 'function');
});

