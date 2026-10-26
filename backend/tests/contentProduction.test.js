import test from 'node:test';
import assert from 'node:assert/strict';
import ContentProduction from '../models/contentProduction.model.js';
import mongoose from 'mongoose';

test('ContentProduction: Schema initializes with default stages and values', () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  const doc = new ContentProduction({
    client: dummyClient,
    clientName: 'Test Client Ltd',
    title: 'Brand Story Reel',
    priority: 'High',
    createdBy: dummyUser,
  });

  assert.equal(doc.title, 'Brand Story Reel');
  assert.equal(doc.clientName, 'Test Client Ltd');
  assert.equal(doc.priority, 'High');
  assert.equal(doc.currentStage, 'Scriptwriting');
  assert.equal(doc.overallStatus, 'Pending');
  assert.equal(doc.isDeleted, false);

  // Default stage subdocuments
  assert.ok(doc.scriptwriter);
  assert.equal(doc.scriptwriter.status, 'Draft');
  assert.equal(doc.scriptwriter.language, 'English');

  assert.ok(doc.videographer);
  assert.equal(doc.videographer.status, 'Scheduled');
  assert.equal(doc.videographer.videoFormat, 'Vertical');

  assert.ok(doc.videoEditor);
  assert.equal(doc.videoEditor.status, 'Pending');
  assert.equal(doc.videoEditor.videoFormat, '9:16');
  assert.equal(doc.videoEditor.videoDuration, '30 sec');

  assert.ok(doc.smm);
  assert.equal(doc.smm.status, 'Content Pending');
  assert.equal(doc.smm.contentType, 'Reel');
});

test('ContentProduction: Validates enum types for stages and statuses', () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  const doc = new ContentProduction({
    client: dummyClient,
    title: 'Product Review Video',
    priority: 'InvalidPriority', // invalid
    createdBy: dummyUser,
  });

  const err = doc.validateSync();
  assert.ok(err);
  assert.ok(err.errors.priority);
});

test('ContentProduction: Stores revisions and activity log items cleanly', () => {
  const dummyClient = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  const doc = new ContentProduction({
    client: dummyClient,
    title: 'Customer Testimonial',
    createdBy: dummyUser,
    revisions: [
      {
        stage: 'Scriptwriting',
        requestedBy: dummyUser,
        requestedByName: 'Creative Director',
        feedback: 'Please make the hook punchier in the first 3 seconds.',
      },
    ],
    activityLog: [
      {
        user: dummyUser,
        userName: 'Creative Director',
        action: 'Created content record',
        stage: 'Scriptwriting',
      },
    ],
  });

  assert.equal(doc.revisions.length, 1);
  assert.equal(doc.revisions[0].stage, 'Scriptwriting');
  assert.equal(doc.revisions[0].feedback, 'Please make the hook punchier in the first 3 seconds.');
  assert.equal(doc.revisions[0].resolved, false);

  assert.equal(doc.activityLog.length, 1);
  assert.equal(doc.activityLog[0].action, 'Created content record');
});
