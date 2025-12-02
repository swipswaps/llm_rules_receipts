
export const performOCR = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR Backend Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error("OCR processing marked as failed by backend.");
    }

    return data.text;
  } catch (error) {
    console.error("OCR Request Failed:", error);
    throw error;
  }
};
