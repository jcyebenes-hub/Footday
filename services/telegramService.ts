
const TELEGRAM_TOKEN = "8284789432:AAH_Elq5mzNciph2FRoxaCeAmwuZHS38I4U";
const CHAT_ID = "-1003452388071";

export const sendTelegramMessage = async (text: string): Promise<boolean> => {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML' 
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
};

export const sendTelegramPhoto = async (base64Image: string): Promise<boolean> => {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
  
  try {
    // Convert base64 to Blob
    const base64Data = base64Image.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, 'pick_infographic.png');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Telegram photo:", error);
    return false;
  }
};
