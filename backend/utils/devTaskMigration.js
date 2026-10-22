// =============================================
// DEV TASK MIGRATION UTILITY
// Ensures development tasks are strictly isolated in 'dev_tasks' collection
// and permanently removed from general 'tasks' collection
// =============================================

import Task from '../models/task.model.js';
import DevTask, { mapDevStageToGlobalStatus } from '../models/development/devTask.model.js';

export const migrateDevTasksFromTasksCollection = async () => {
  try {
    const legacyDevTasks = await Task.find({
      $or: [
        { department: { $regex: /^development$/i } },
        { 'development.isDevTask': true },
        { isDevTask: true },
      ],
    }).lean();

    if (!legacyDevTasks || legacyDevTasks.length === 0) {
      return;
    }

    let migratedCount = 0;

    for (const legacy of legacyDevTasks) {
      const existing = await DevTask.findById(legacy._id);
      if (!existing) {
        const devStage = legacy.development?.stage || 'backlog';
        const doc = {
          ...legacy,
          department: 'Development',
          taskCategory: 'development',
          isDevTask: true,
          stage: devStage,
          status: legacy.status || mapDevStageToGlobalStatus(devStage),
          developer: legacy.development?.developer || (Array.isArray(legacy.assignedTo) ? legacy.assignedTo[0] : null),
          reviewer: legacy.development?.reviewer || null,
          tester: legacy.development?.tester || null,
          sprint: legacy.development?.sprint || null,
          release: legacy.development?.release || null,
          isBlocked: Boolean(legacy.development?.isBlocked),
          blockedReason: legacy.development?.blockedReason || '',
          blockedBy: legacy.development?.blockedBy || null,
          blockedAt: legacy.development?.blockedAt || null,
          isBug: Boolean(legacy.development?.isBug || legacy.nonContentCategory === 'bug_fix'),
          bugSeverity: legacy.development?.bugSeverity || '',
          branch: legacy.development?.branch || '',
          pullRequestUrl: legacy.development?.pullRequestUrl || '',
          pullRequestNumber: legacy.development?.pullRequestNumber || '',
          commitHash: legacy.development?.commitHash || '',
          development: {
            isDevTask: true,
            stage: devStage,
            developer: legacy.development?.developer || (Array.isArray(legacy.assignedTo) ? legacy.assignedTo[0] : null),
            reviewer: legacy.development?.reviewer || null,
            tester: legacy.development?.tester || null,
            sprint: legacy.development?.sprint || null,
            release: legacy.development?.release || null,
            isBlocked: Boolean(legacy.development?.isBlocked),
            blockedReason: legacy.development?.blockedReason || '',
            isBug: Boolean(legacy.development?.isBug || legacy.nonContentCategory === 'bug_fix'),
            bugSeverity: legacy.development?.bugSeverity || '',
            branch: legacy.development?.branch || '',
            pullRequestUrl: legacy.development?.pullRequestUrl || '',
            pullRequestNumber: legacy.development?.pullRequestNumber || '',
          },
        };
        await DevTask.create(doc);
      }
      // Remove from the generic 'tasks' collection
      await Task.findByIdAndDelete(legacy._id);
      migratedCount += 1;
    }

    if (migratedCount > 0) {
      console.log(`[DevTask Migration] Successfully moved ${migratedCount} development task(s) to 'dev_tasks' collection.`);
    }
  } catch (err) {
    console.error('[DevTask Migration Error]', err.message);
  }
};
