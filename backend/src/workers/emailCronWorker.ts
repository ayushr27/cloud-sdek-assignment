import { Queue, Worker } from 'bullmq';
import { getBullMQRedis, isBullMQAvailable } from '../queues/generationQueue';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

export async function initEmailCronJob() {
  const redis = getBullMQRedis();
  if (!redis || !isBullMQAvailable()) {
    console.log('⚠️  Redis not available, skipping email cron job.');
    return;
  }

  try {
    const emailQueue = new Queue('email-digest', { connection: redis as any });
    
    // Add repeatable job - every day at 8:00 AM
    await emailQueue.add('daily-digest', {}, {
      repeat: { pattern: '0 8 * * *' },
      jobId: 'daily-email-digest'
    });

    const emailWorker = new Worker('email-digest', async (job) => {
      console.log('📧 Running daily email digest job...');
      
      // Find users with unread notifications
      const users = await User.find({});
      for (const user of users) {
        const unreadCount = await Notification.countDocuments({ user: user._id, read: false });
        if (unreadCount > 0) {
          // Send an email (mocked here)
          console.log(`[Email] Sending digest to ${user.email} - You have ${unreadCount} unread notifications.`);
        }
      }
      
      return { success: true };
    }, { connection: redis as any });

    emailWorker.on('completed', (j) => console.log('✅ Email digest job completed.'));
    emailWorker.on('failed', (j, err) => console.error('❌ Email digest job failed:', err));
    
    console.log('✅ Email cron job initialized');
  } catch (err) {
    console.error('Failed to init email cron job', err);
  }
}
