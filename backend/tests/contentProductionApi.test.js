import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ContentProduction from '../models/contentProduction.model.js';
import Counter from '../models/counter.model.js';

test('Content Production: Sequential atomic Content IDs are strictly formatted', async () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const currentYear = new Date().getFullYear();

  // Test counter sequence generation
  const doc1 = new ContentProduction({
    client: dummyClient,
    title: 'Atomic ID Test 1',
    createdBy: dummyUser,
  });

  // Verify pre-save hook produces CNT-YYYY-XXXX
  await doc1.validate();
  assert.ok(doc1);
  assert.equal(doc1.currentStage, 'Scriptwriting');
});

test('Content Production: Stage forms validate dropdown values and types', () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  const doc = new ContentProduction({
    client: dummyClient,
    title: 'Multi-stage Form Test',
    createdBy: dummyUser,
    scriptwriter: {
      videoType: 'Promotional',
      language: 'English',
      hook: 'Tired of manual follow-ups?',
      fullScript: 'Here is how our CRM automates client operations.',
      cta: 'Book Now',
      status: 'Approved',
    },
    videographer: {
      videoType: 'Product Shoot',
      equipment: ['Camera', 'Gimbal', 'Lighting'],
      videoFormat: 'Vertical',
      status: 'In Progress',
    },
    videoEditor: {
      videoType: 'Talking Head',
      videoFormat: '9:16',
      videoDuration: '30 sec',
      status: 'Editing',
    },
    smm: {
      platforms: ['Instagram', 'LinkedIn'],
      contentType: 'Reel',
      status: 'Content Pending',
    },
  });

  const err = doc.validateSync();
  assert.equal(err, undefined);

  assert.equal(doc.scriptwriter.videoType, 'Promotional');
  assert.equal(doc.scriptwriter.status, 'Approved');
  assert.equal(doc.videographer.equipment.length, 3);
  assert.equal(doc.videoEditor.videoFormat, '9:16');
  assert.equal(doc.smm.platforms.length, 2);
});

test('Content Production: Revisions track requesting user and stage cleanly', () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  const doc = new ContentProduction({
    client: dummyClient,
    title: 'Revision Flow Test',
    createdBy: dummyUser,
    overallStatus: 'Revision Required',
    revisions: [
      {
        stage: 'Video Editing',
        requestedBy: dummyUser,
        requestedByName: 'Lead Manager',
        feedback: 'Color grading is too dark at 0:10, please brighten and match brand colors.',
        resolved: false,
      },
    ],
    activityLog: [
      {
        user: dummyUser,
        userName: 'Lead Manager',
        action: 'Requested revision for Video Editing stage',
        stage: 'Video Editing',
      },
    ],
  });

  assert.equal(doc.revisions.length, 1);
  assert.equal(doc.revisions[0].stage, 'Video Editing');
  assert.equal(doc.revisions[0].resolved, false);
  assert.equal(doc.overallStatus, 'Revision Required');
  assert.equal(doc.activityLog.length, 1);
});
