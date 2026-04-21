async function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("浏览器未允许复制到剪贴板。");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(text: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  await fallbackCopyText(text);
}

export async function readClipboardTextSafely() {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.readText !== "function"
  ) {
    return null;
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export async function clearClipboardIfUnchanged(originalText: string) {
  const currentText = await readClipboardTextSafely();

  if (currentText !== originalText) {
    return false;
  }

  await copyTextToClipboard("");
  return true;
}
