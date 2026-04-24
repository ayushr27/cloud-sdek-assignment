import mongoose from 'mongoose';
import { config } from './config';
import { Resource } from './models/Resource';
import { User } from './models/User';

async function testDelete() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');

  const users = await User.find();
  if (users.length === 0) { console.log('No users found.'); return; }

  const uId = users[0]._id.toString();

  const resources = await Resource.find({ uploadedBy: uId });
  for (const r of resources) {
    console.log(`Resource: ${r._id} | Title: ${r.title} | Uploaded by: ${r.uploadedBy}`);
    // Check if toString works
    if (r.uploadedBy.toString() === uId) {
       console.log("MATCHES!");
    } else {
       console.log("DOES NOT MATCH: ", r.uploadedBy.toString(), uId);
    }
  }

  process.exit(0);
}
testDelete();
