// 导出工具函数

/**
 * 导出为 CSV 格式
 */
export async function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  columns?: { key: string; header: string }[]
): Promise<void> {
  // 如果没有指定列，使用所有字段作为列
  const headers = columns || Object.keys(data[0] || {}).map(key => ({
    key,
    header: key
  }));

  // 构建 CSV 内容
  const csvRows = [
    headers.map(h => h.header).join(','),
    ...data.map(row =>
      headers.map(h => {
        let value = row[h.key];
        
        // 处理特殊字符
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }
        
        return value ?? '';
      }).join(',')
    )
  ];

  const csvContent = '\ufeff' + csvRows.join('\n'); // BOM for Excel

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * 导出为 JSON 格式
 */
export async function exportToJSON(
  data: any[],
  filename: string,
  prettyPrint = true
): Promise<void> {
  const jsonContent = prettyPrint 
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);

  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(
  text: string,
  successMessage = '已复制到剪贴板'
): Promise<boolean> {
  try {
    // 尝试使用现代 Clipboard API
    await navigator.clipboard.writeText(text);

    // 显示成功提示（可选）
    if (successMessage) {
      showToast(successMessage, 'success');
    }

    return true;
  } catch (error) {
    console.error('Clipboard API failed:', error);

    // Fallback: 使用 execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful && successMessage) {
        showToast(successMessage, 'success');
      }

      return successful;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      showToast('复制失败，请手动复制', 'error');
      return false;
    }
  }
}

/**
 * 下载文件
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType?: string
): void {
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType || 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 打印内容
 */
export function printContent(content: string, title = '打印'): void {
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  }
}

/**
 * 生成分享海报图片（Canvas）
 */
export async function generatePosterImage(options: {
  title: string;
  content: string;
  studentName?: string;
  type?: string;
  width?: number;
  height?: number;
}): Promise<Blob> {
  const {
    title: _title,
    content,
    studentName,
    type = '评语',
    width = 800,
    height = 1200
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    try {
      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 标题区域背景
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, width, 200);

      // 标题文字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎓 评语助手', width / 2, 120);

      ctx.font = '32px sans-serif';
      ctx.fillText('AI赋能每一位教师', width / 2, 170);

      // 学生信息
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(`${studentName || '学生'} 的${type}`, width / 2, 280);

      // 分隔线
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 320);
      ctx.lineTo(width - 50, 320);
      ctx.stroke();

      // 评语内容（自动换行）
      ctx.fillStyle = '#334155';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'left';
      
      wrapText(ctx, content, 50, 380, width - 100, 42);

      // 底部信息
      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`生成时间：${new Date().toLocaleDateString('zh-CN')}`, width / 2, height - 150);
      ctx.fillText('teachers.minicode.cloud', width / 2, height - 110);

      // 二维码占位框
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(width / 2 - 60, height - 90, 120, 80);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('扫码体验', width / 2, height - 45);

      // 转换为 Blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Canvas 文本自动换行辅助函数
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split('');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      
      // 防止超出画布
      if (currentY > 1050) {
        ctx.fillText(line + '...', x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, currentY);
}

/**
 * 简单的 Toast 提示
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
  
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  toast.classList.add(bgColor, 'text-white');
  
  toast.textContent = message;
  document.body.appendChild(toast);

  // 动画显示
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });

  // 自动消失
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}
