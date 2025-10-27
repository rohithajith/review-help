export const copyTextToClipboard = (text) => {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Unable to copy', err);
    }
    document.body.removeChild(textArea);
  } else {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Async: Could not copy text: ', err);
    });
  }
};