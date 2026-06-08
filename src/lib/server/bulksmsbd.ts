export async function sendSMS(number: string, message: string) {
  const apiKey = process.env.BULKSMSBD_API_KEY;
  const senderId = process.env.BULKSMSBD_SENDER_ID;

  if (!apiKey || !senderId) {
    console.warn('BulkSMSBD credentials not found in env, skipping actual SMS send.');
    console.log(`[MOCK SMS] To: ${number} | Message: ${message}`);
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('api_key', apiKey);
    formData.append('senderid', senderId);
    formData.append('number', number);
    formData.append('message', message);

    const response = await fetch('http://bulksmsbd.net/api/smsapi', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.response_code === 202) {
      return true;
    } else {
      console.error('BulkSMSBD error:', data);
      return false;
    }
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}
