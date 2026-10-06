const express = require('express');

const router = express.Router();
const OLLAMA_API_URL = 'http://localhost:11434/api';
const OLLAMA_TIMEOUT_MS = 120000;
const MAX_MESSAGE_LENGTH = 2000;

const fetchOllama = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    return await fetch(`${OLLAMA_API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

router.post('/', async (req, res) => {
  const { message } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'A message is required.' });
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
  }

  let modelList;

  try {
    const tagsResponse = await fetchOllama('/tags');
    if (!tagsResponse.ok) {
      console.error(`Ollama model list request failed with status ${tagsResponse.status}.`);
      return res.status(503).json({ message: 'Unable to get the installed model list from local Ollama.' });
    }

    modelList = await tagsResponse.json();
  } catch (error) {
    console.error('Ollama model list request failed:', error);
    return res.status(503).json({ message: 'Local Ollama is unavailable. Start Ollama and try again.' });
  }

  const model = modelList.models?.find((installedModel) => typeof installedModel.name === 'string')?.name;
  if (!model) {
    return res.status(503).json({
      message: 'No Ollama models are installed. Install a model locally, then try again.'
    });
  }

  try {
    const ollamaResponse = await fetchOllama('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant in a daily habit tracker. Answer general questions clearly. For habit-related questions, give practical, encouraging, realistic steps that help the user build or maintain habits. Do not claim to access the user’s tracker data.'
          },
          { role: 'user', content: message.trim() }
        ]
      })
    });

    const result = await ollamaResponse.json();
    if (!ollamaResponse.ok) {
      console.error(`Ollama chat request failed with status ${ollamaResponse.status}:`, result.error || 'Unknown Ollama error');
      return res.status(502).json({ message: result.error || 'Local Ollama could not generate a response.' });
    }

    const response = result.message?.content;
    if (typeof response !== 'string' || !response.trim()) {
      console.error('Ollama returned an empty or invalid chat response.');
      return res.status(502).json({ message: 'Local Ollama returned an empty response. Please try again.' });
    }

    return res.json({ response: response.trim() });
  } catch (error) {
    console.error('Ollama chat request failed:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ message: 'Local Ollama took too long to respond. Please try again.' });
    }
    return res.status(502).json({ message: 'Unable to get a response from local Ollama.' });
  }
});

module.exports = router;
