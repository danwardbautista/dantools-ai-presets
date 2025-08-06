export const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }
};