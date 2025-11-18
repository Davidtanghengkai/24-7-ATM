//1. import dependencies
const express = require('express');
const router = express.Router();
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

//2. create instance of assistant
const authenticator = new IamAuthenticator({
  apikey: process.env.WATSON_ASSISTANT_APIKEY,
});

const assistant = new AssistantV2({
  version: '2021-06-14',
  authenticator,
  serviceUrl: process.env.WATSON_ASSISTANT_URL, // use serviceUrl
});

//3. Route to handle session tokens
// GET /api/watson/session
router.get('/session', async (req, res) => {
  try {
    const session = await assistant.createSession({
      assistantId: process.env.WATSON_ASSISTANT_ID,
      environmentId: process.env.WATSON_ASSISTANT_ENV_ID,
    });

    // LOG what Watson returns for createSession
    console.log('Watson createSession result:');
    console.log(JSON.stringify(session.result, null, 2));

    res.json(session.result);
  } catch (error) {
    console.error('Watson createSession error:', error.message);
    if (error.options && error.options.body) {
      console.error('Watson createSession error body:');
      console.error(JSON.stringify(error.options.body, null, 2));
    }
    res.status(500).json({ error: error.message, details: error?.options?.body });
  }
});

//4. handle messages

// POST /api/watson/message
router.post('/message', async (req, res) => {
  const sessionId = req.headers.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id header' });
  }

  const payload = {
    assistantId: process.env.WATSON_ASSISTANT_ID,
    sessionId,
    environmentId: process.env.WATSON_ASSISTANT_ENV_ID,
    userId: 'local-user-001',
    input: {
      message_type: 'text',
      text: req.body.input || '',
    },
  };

  // LOG the payload you send to Watson
  console.log('Watson message payload:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await assistant.message(payload);

    // LOG the full result from Watson
    console.log('Watson message result:');
    console.log(JSON.stringify(response.result, null, 2));
    
    res.json(response.result);
  } catch (error) {
    console.error('Watson message error:', error.message);
    if (error.options && error.options.body) {
      console.error('Watson message error body:');
      console.error(JSON.stringify(error.options.body, null, 2));
    }
    res
      .status(error.status || 500)
      .json({ error: error.message, details: error?.options?.body });
  }
});


module.exports = router;
