// Envío a Telegram vía backend (POST /api/telegram).
// El token del bot y el chat viven en el servidor y nunca salen al navegador.

export const sendTelegramMessage = async (text: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
};

export const sendTelegramPhoto = async (base64Image: string, caption?: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: base64Image, text: caption }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram photo:", error);
    return false;
  }
};
