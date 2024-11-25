import Pusher from 'pusher';
import PusherPushNotifications from '@pusher/push-notifications-server';
import 'dotenv/config';

let pusher;
let beamsClient;

try {
  // Initialize Pusher Channels
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });

  // Initialize Pusher Beams
  beamsClient = new PusherPushNotifications({
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
    secretKey: process.env.PUSHER_BEAMS_SECRET_KEY,
  });

  console.log('Pusher and Pusher Beams initialized successfully');
} catch (error) {
  console.error('Pusher initialization error:', error);
}

export { pusher, beamsClient };
