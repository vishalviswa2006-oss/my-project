document.addEventListener('DOMContentLoaded', () => {
  const widget = document.createElement('div');
  widget.className = 'chat-widget';
  widget.innerHTML = `
    <section class="chat-panel" id="chatPanel" aria-label="Habit assistant" hidden>
      <header class="chat-header">
        <div>
          <p class="chat-eyebrow">Local AI assistant</p>
          <h2>Habit helper</h2>
        </div>
        <button class="chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="chat-messages" id="chatMessages" role="log" aria-live="polite" aria-relevant="additions">
        <div class="chat-message assistant-message">
          <p>Hi! Ask a general question or get help building a habit.</p>
        </div>
      </div>
      <p class="chat-error" id="chatError" role="alert" hidden></p>
      <form class="chat-form" id="chatForm">
        <label class="visually-hidden" for="chatInput">Your message</label>
        <textarea id="chatInput" rows="1" maxlength="2000" placeholder="Ask me anything..." required></textarea>
        <button class="chat-send" id="chatSend" type="submit" aria-label="Send message">Send</button>
      </form>
      <p class="chat-local-note">Runs with Ollama on this computer</p>
    </section>
    <button class="chat-launcher" type="button" aria-controls="chatPanel" aria-expanded="false">
      <span aria-hidden="true">✦</span> Chat
    </button>
  `;
  document.body.appendChild(widget);

  const panel = widget.querySelector('#chatPanel');
  const launcher = widget.querySelector('.chat-launcher');
  const closeButton = widget.querySelector('.chat-close');
  const messages = widget.querySelector('#chatMessages');
  const form = widget.querySelector('#chatForm');
  const input = widget.querySelector('#chatInput');
  const sendButton = widget.querySelector('#chatSend');
  const errorMessage = widget.querySelector('#chatError');
  let isSending = false;
  let loadingMessage;

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const addMessage = (text, role) => {
    const message = document.createElement('div');
    message.className = `chat-message ${role}-message`;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    message.appendChild(paragraph);
    messages.appendChild(message);
    scrollToLatest();
    return message;
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  };

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => {
    setOpen(false);
    launcher.focus();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!isSending) form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || isSending) return;

    isSending = true;
    errorMessage.hidden = true;
    errorMessage.textContent = '';
    addMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;
    loadingMessage = addMessage('Thinking…', 'assistant');
    loadingMessage.classList.add('chat-loading');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'The local assistant could not respond.');
      }

      loadingMessage.remove();
      loadingMessage = null;
      addMessage(data.response, 'assistant');
    } catch (error) {
      if (loadingMessage) {
        loadingMessage.remove();
        loadingMessage = null;
      }
      errorMessage.textContent = error.message || 'Unable to contact the local assistant.';
      errorMessage.hidden = false;
      scrollToLatest();
    } finally {
      isSending = false;
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  });
});
