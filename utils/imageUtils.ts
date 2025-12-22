export const fileToBase64 = (file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<{mimeType: string, data: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Resize logic
                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    } else {
                        width = Math.round(width * (maxWidth / height));
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                const mimeType = 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, quality);
                const base64String = dataUrl.split(',')[1];
                
                if (!base64String) {
                    return reject(new Error('Failed to extract base64 string from data URL.'))
                }
                
                resolve({ mimeType, data: base64String });
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};