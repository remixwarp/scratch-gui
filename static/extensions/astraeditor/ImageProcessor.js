// Name: image processor
// ID: ImageProcessor
// Description: A simple image processing
// By: CramYing <https://b23.tv/9qx3DTK>
// License: MIT
const ImageProcessingIcon = 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMjEuMjUyMTUiIGhlaWdodD0iMjIxLjYxODA1IiB2aWV3Qm94PSIwLDAsMjIxLjI1MjE1LDIyMS42MTgwNSI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIyNDAiIHkxPSI3MC40NDA5NyIgeDI9IjI0MCIgeTI9IjI4OS41NTkwMyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJjb2xvci0xIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM2NmEzZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNiZmQ5ZmYiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMjQwIiB5MT0iNzAuMjMyMiIgeDI9IjI0MCIgeTI9IjI4OS4zNTAyNCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJjb2xvci0yIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNiZmQ5ZmYiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMTg2LjY0NDQ0IiB5MT0iOTYuNDc5MzUiIHgyPSIxODYuNjQ0NDQiIHkyPSIxNjAuNTg5MzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBpZD0iY29sb3ItMyI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmNDYxIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZiNDYxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEyOS4zNzM5MywtNjkuMTkwOTgpIj48ZyBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiPjxwYXRoIGQ9Ik0xODUuMzExODYsMjg5LjU1OTAzYy0zMC4yMDMzLDAgLTU0LjY4NzkzLC0yNC40ODQ2MyAtNTQuNjg3OTMsLTU0LjY4Nzkzdi0xMDkuNzQyMTljMCwtMzAuMjAzMyAyNC40ODQ2MywtNTQuNjg3OTMgNTQuNjg3OTMsLTU0LjY4NzkzaDEwOS4zNzYyOWMzMC4yMDMzLDAgNTQuNjg3OTMsMjQuNDg0NjMgNTQuNjg3OTMsNTQuNjg3OTN2MTA5Ljc0MjE5YzAsMzAuMjAzMyAtMjQuNDg0NjMsNTQuNjg3OTMgLTU0LjY4NzkzLDU0LjY4NzkzeiIgZmlsbD0idXJsKCNjb2xvci0xKSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJNMTg1LjMxMTg2LDI4OS4zNTAyNGMtMzAuMjAzMywwIC01NC42ODc5MywtMjQuNDg0NjMgLTU0LjY4NzkzLC01NC42ODc5M2MwLDAgMTAxLjcxMjA3LC03Mi44ODYwMyAxMjUuMTQ3MTMsLTg5LjY3OTM5YzkuMTUzOTIsLTYuNTU5NjIgMjMuMTUzMywtMi4wNjYzOCAyOC41MjI1OSw1LjM4MTk2YzEyLjU3MjQ2LDE3LjQ0MDY2IDY1LjA4MjQzLDg0LjI5NzQ0IDY1LjA4MjQzLDg0LjI5NzQ0YzAsMzAuMjAzMyAtMjQuNDg0NjMsNTQuNjg3OTMgLTU0LjY4NzkzLDU0LjY4NzkzeiIgZmlsbD0idXJsKCNjb2xvci0yKSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJNMjE4LjY5NzM3LDEyOC41MzQzNWMwLDE3LjcwMzUgLTE0LjM1MDU4LDMyLjA1NTAxIC0zMi4wNTI5MywzMi4wNTUwMWMtMTcuNzAyMzUsMCAtMzIuMDUyOTIsLTE0LjM1MTUyIC0zMi4wNTI5MiwtMzIuMDU1MDFjMCwtMTcuNzAzNSAxNC4zNTA1OCwtMzIuMDU1MDEgMzIuMDUyOTIsLTMyLjA1NTAxYzE3LjcwMjM1LDAgMzIuMDUyOTMsMTQuMzUxNTIgMzIuMDUyOTMsMzIuMDU1MDF6IiBmaWxsPSJ1cmwoI2NvbG9yLTMpIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMCIvPjxwYXRoIGQ9Ik0xODUuMzExODYsMjg5LjU1OTA0Yy0zMC4yMDMzLDAgLTU0LjY4NzkzLC0yNC40ODQ2MyAtNTQuNjg3OTMsLTU0LjY4Nzkzdi0xMDkuNzQyMTljMCwtMzAuMjAzMyAyNC40ODQ2MywtNTQuNjg3OTMgNTQuNjg3OTMsLTU0LjY4NzkzaDEwOS4zNzYyOWMzMC4yMDMzLDAgNTQuNjg3OTMsMjQuNDg0NjMgNTQuNjg3OTMsNTQuNjg3OTN2MTA5Ljc0MjE5YzAsMzAuMjAzMyAtMjQuNDg0NjMsNTQuNjg3OTMgLTU0LjY4NzkzLDU0LjY4NzkzeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIuNSIvPjwvZz48L2c+PC9zdmc+'

class ImageProcessor {
    getInfo() {
        return {
            id: 'ImageProcessor',
            name: '图像处理',
            color1: '#66a3ff',
            color2:'#bfd9ff',
            menuIconURI: ImageProcessingIcon,
            blockIconURI: ImageProcessingIcon,
            blocks: [
                {
                    opcode: 'cropRoundCorners',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '裁剪圆角 [IMAGE] X [X] Y [Y] 宽 [WIDTH] 高 [HEIGHT] 圆角 [RADIUS] 倍数 [SCALE]',
                    arguments: {
                        IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                        HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                        RADIUS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
                        SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }
                },
                {
                    opcode: 'gaussianBlur',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '高斯模糊 [IMAGE] 程度 [RADIUS] 倍数 [SCALE]',
                    arguments: {
                        IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        RADIUS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
                        SCALE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }
                },
                {
                    opcode: 'resizeImage',
                    blockType: Scratch.BlockType.REPORTER,
                    text: '调整分辨率 [IMAGE] 宽度 [WIDTH] 高度 [HEIGHT]',
                    arguments: {
                        IMAGE: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                        WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 400 },
                        HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 300 }
                    }
                }
            ]
        };
    }

    async cropRoundCorners(args) {
        const img = await this._loadImage(args.IMAGE);
        if (!img) return args.IMAGE;
        
        const x = Math.max(0, args.X);
        const y = Math.max(0, args.Y);
        const w = Math.max(1, args.WIDTH);
        const h = Math.max(1, args.HEIGHT);
        const r = Math.max(0, Math.min(args.RADIUS, Math.min(w, h) / 2));
        const s = Math.max(0.1, Math.min(args.SCALE, 10));
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (r > 0) {
            canvas.width = w;
            canvas.height = h;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.quadraticCurveTo(w, 0, w, r);
            ctx.lineTo(w, h - r);
            ctx.quadraticCurveTo(w, h, w - r, h);
            ctx.lineTo(r, h);
            ctx.quadraticCurveTo(0, h, 0, h - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
            ctx.clip();
        } else {
            canvas.width = w;
            canvas.height = h;
        }
        
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        
        if (s !== 1) {
            const scaledCanvas = document.createElement('canvas');
            const scaledCtx = scaledCanvas.getContext('2d');
            scaledCanvas.width = w * s;
            scaledCanvas.height = h * s;
            scaledCtx.drawImage(canvas, 0, 0, w * s, h * s);
            return scaledCanvas.toDataURL();
        }
        
        return canvas.toDataURL();
    }

    async gaussianBlur(args) {
        const img = await this._loadImage(args.IMAGE);
        if (!img) return args.IMAGE;
        
        const r = Math.min(Math.abs(args.RADIUS), 50);
        const s = Math.max(0.1, Math.min(args.SCALE, 10));
        const w = Math.round(img.width * s);
        const h = Math.round(img.height * s);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;
        
        if (r > 0) ctx.filter = `blur(${r}px)`;
        ctx.drawImage(img, 0, 0, w, h);
        
        return canvas.toDataURL();
    }

    async resizeImage(args) {
        const img = await this._loadImage(args.IMAGE);
        if (!img) return args.IMAGE;
        
        const w = Math.max(1, args.WIDTH);
        const h = Math.max(1, args.HEIGHT);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        return canvas.toDataURL();
    }

    _loadImage(url) {
        return new Promise((resolve) => {
            if (!url || !url.startsWith('data:image/')) {
                resolve(null);
                return;
            }
            
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }
}

Scratch.extensions.register(new ImageProcessor());