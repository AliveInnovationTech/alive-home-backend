// "use strict";
// const admin = require("firebase-admin");
// //const serviceAccount = require("/path/to/your/serviceAccountKey.json");


// if (!admin.apps.length) {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//     });
// }

// /**
//  * Send a push notification to a device
//  * @param {string} deviceToken - FCM device token
//  * @param {string} title - Notification title
//  * @param {string} body - Notification body
//  * @param {object} [data] - Optional data payload
//  * @returns {Promise<object>}
//  */
// async function sendPushNotification(deviceToken, title, body, data = {}) {
//     const message = {
//         token: deviceToken,
//         notification: {
//             title,
//             body,
//         },
//         data,
//     };

//     try {
//         const response = await admin.messaging().send(message);
//         return { success: true, response };
//     } catch (error) {
//         return { success: false, error };
//     }
// }

// module.exports = { sendPushNotification };