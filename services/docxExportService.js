const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} = require('docx');
const marked = require('marked');

/**
 * Chuẩn hóa nội dung văn bản: Làm sạch các thẻ HTML bọc thừa (nếu có từ visual editor)
 * và chuyển đổi về cấu trúc Markdown tiêu chuẩn.
 */
function normalizeContentToMarkdown(rawContent) {
  if (!rawContent) return '';
  let str = String(rawContent);

  // 1. Loại bỏ các thẻ div bọc ngoài của visual editor
  str = str.replace(/<div\s+id=["']editor-visual["'][^>]*>/gi, '');
  str = str.replace(/<div\s+class=["']visual-editor["'][^>]*>/gi, '');
  str = str.replace(/<\/div>\s*$/gi, '');

  // 2. Chuẩn hóa Video iframe container
  str = str.replace(/<div class="video-container">[\s\S]*?<iframe\s+src=["']([^"']+)["'][\s\S]*?<\/iframe>[\s\S]*?<\/div>/gi, '\n\n🎬 [Video YouTube: $1]\n\n');
  str = str.replace(/<iframe\s+src=["']([^"']+)["'][\s\S]*?<\/iframe>/gi, '\n\n🎬 [Video YouTube: $1]\n\n');

  // 3. Chuyển đổi bảng HTML sang bảng Markdown (nếu có thẻ <table>)
  str = str.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableBody) => {
    const trMatches = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (trMatches.length === 0) return '';
    let rows = [];
    trMatches.forEach((trHtml, rIdx) => {
      const cellMatches = trHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      const cells = cellMatches.map(c => c.replace(/<\/?(th|td)[^>]*>/gi, '').trim().replace(/\|/g, '\\|') || ' ');
      if (cells.length > 0) {
        rows.push('| ' + cells.join(' | ') + ' |');
        if (rIdx === 0) {
          rows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
        }
      }
    });
    return '\n\n' + rows.join('\n') + '\n\n';
  });

  // 4. Chuyển đổi các thẻ tiêu đề HTML sang Markdown
  str = str.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  str = str.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  str = str.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  str = str.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // 5. Chuyển đổi danh sách HTML sang Markdown
  str = str.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n* $1');
  str = str.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  // 6. Chuyển đổi các thẻ định dạng inline
  str = str.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  str = str.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  str = str.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  str = str.replace(/<a\s+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  str = str.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  str = str.replace(/<br\s*\/?>/gi, '\n');

  // 7. Loại bỏ bất kỳ thẻ HTML nào còn sót lại
  str = str.replace(/<(?!\/?(strong|em|b|i|a|img|code))\/?([a-z0-9_-]+)[^>]*>/gi, ' ');

  // Thu gọn các dòng trắng thừa
  return str.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Phân tích chuỗi text chứa định dạng inline (**in đậm**, *nghiêng*, `code`, [link](url))
 * thành danh sách các TextRun trong Word.
 */
function parseInlineToRuns(text, baseOptions = {}) {
  if (!text) return [];

  const runs = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: baseOptions.size || 22,
          color: baseOptions.color || '0F172A',
          font: 'Arial'
        })
      );
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
          size: baseOptions.size || 22,
          color: baseOptions.color || '1E293B',
          font: 'Arial'
        })
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: 'Consolas',
          size: 20,
          color: 'BE185D'
        })
      );
    } else if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        runs.push(
          new TextRun({
            text: match[1],
            color: '1D4ED8',
            underline: {},
            size: baseOptions.size || 22,
            font: 'Arial'
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: part,
            size: baseOptions.size || 22,
            color: baseOptions.color || '1E293B',
            font: 'Arial'
          })
        );
      }
    } else {
      runs.push(
        new TextRun({
          text: part,
          size: baseOptions.size || 22,
          color: baseOptions.color || '1E293B',
          font: 'Arial',
          ...baseOptions
        })
      );
    }
  }

  return runs;
}

/**
 * Chuyển đổi tokens inline của marked thành danh sách TextRun
 */
function renderMarkedTokensToRuns(tokens, baseOptions = {}) {
  if (!tokens || !Array.isArray(tokens)) return [];
  const runs = [];

  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        runs.push(...parseInlineToRuns(t.text || '', baseOptions));
        break;
      case 'strong':
        if (t.tokens) {
          runs.push(...renderMarkedTokensToRuns(t.tokens, { ...baseOptions, bold: true, color: '0F172A' }));
        } else {
          runs.push(
            new TextRun({
              text: t.text || '',
              bold: true,
              size: baseOptions.size || 22,
              color: '0F172A',
              font: 'Arial'
            })
          );
        }
        break;
      case 'em':
        if (t.tokens) {
          runs.push(...renderMarkedTokensToRuns(t.tokens, { ...baseOptions, italics: true }));
        } else {
          runs.push(
            new TextRun({
              text: t.text || '',
              italics: true,
              size: baseOptions.size || 22,
              color: baseOptions.color || '1E293B',
              font: 'Arial'
            })
          );
        }
        break;
      case 'codespan':
        runs.push(
          new TextRun({
            text: t.text || '',
            font: 'Consolas',
            size: 20,
            color: 'BE185D'
          })
        );
        break;
      case 'link':
        runs.push(
          new TextRun({
            text: t.text || t.href || '',
            color: '1D4ED8',
            underline: {},
            size: baseOptions.size || 22,
            font: 'Arial'
          })
        );
        break;
      default:
        if (t.text) {
          runs.push(...parseInlineToRuns(t.text, baseOptions));
        }
        break;
    }
  }

  return runs;
}

/**
 * Xuất bài viết đầy đủ ra định dạng Microsoft Word (.docx) chuyên nghiệp
 */
async function generateDocxBuffer(articleData, selectedKeyword) {
  const {
    h1Title = 'Bài Viết Chuẩn SEO',
    metaTitle = '',
    slug = '',
    metaDescription = '',
    contentMarkdown = ''
  } = articleData;

  const docChildren = [];

  // 1. Tiêu đề chính bài viết (H1)
  docChildren.push(
    new Paragraph({
      text: h1Title,
      heading: HeadingLevel.TITLE,
      spacing: { before: 100, after: 240 },
      alignment: AlignmentType.LEFT
    })
  );

  // 2. Bảng thông số SEO Metadata chuẩn Yoast SEO
  const borderThin = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
  const borderSubtle = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
  const metaTableBorders = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
    insideHorizontal: borderSubtle,
    insideVertical: borderSubtle
  };

  function createMetaRow(label, value) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          borders: metaTableBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: label, bold: true, size: 20, color: '1E293B', font: 'Arial' })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          borders: metaTableBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: value || '(Chưa có dữ liệu)', size: 20, color: '334155', font: 'Arial' })
              ]
            })
          ]
        })
      ]
    });
  }

  const metaRows = [
    createMetaRow('Từ khóa chính', selectedKeyword),
    createMetaRow('SEO Title', metaTitle || h1Title),
    createMetaRow('URL Slug', slug || ''),
    createMetaRow('Meta Description', metaDescription || '')
  ];

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'THÔNG SỐ CẤU HÌNH YOAST SEO', bold: true, size: 22, color: '1A56DB', font: 'Arial' })
      ],
      spacing: { before: 180, after: 100 }
    })
  );

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows
    })
  );

  docChildren.push(new Paragraph({ spacing: { after: 300 } }));

  // 3. Chuẩn hóa nội dung sang Markdown sạch sẽ 100%
  const cleanedMarkdown = normalizeContentToMarkdown(contentMarkdown);

  // 4. Tokenize bằng Marked Lexer để xử lý từng khối nội dung
  const tokens = marked.lexer(cleanedMarkdown);

  for (const token of tokens) {
    switch (token.type) {
      // Tiêu đề các cấp H2, H3, H4
      case 'heading': {
        let headingLvl = HeadingLevel.HEADING_2;
        let textSize = 28; // 14pt
        let textColor = '1E3A8A';
        let spaceBefore = 280;
        let spaceAfter = 120;

        if (token.depth === 2) {
          headingLvl = HeadingLevel.HEADING_1;
          textSize = 32; // 16pt
          textColor = '1E3A8A';
          spaceBefore = 360;
          spaceAfter = 140;
        } else if (token.depth === 3) {
          headingLvl = HeadingLevel.HEADING_2;
          textSize = 28; // 14pt
          textColor = '334155';
          spaceBefore = 240;
          spaceAfter = 100;
        } else if (token.depth >= 4) {
          headingLvl = HeadingLevel.HEADING_3;
          textSize = 24; // 12pt
          textColor = '475569';
          spaceBefore = 180;
          spaceAfter = 80;
        }

        const headingRuns = token.tokens
          ? renderMarkedTokensToRuns(token.tokens, { bold: true, size: textSize, color: textColor })
          : [new TextRun({ text: token.text, bold: true, size: textSize, color: textColor, font: 'Arial' })];

        docChildren.push(
          new Paragraph({
            children: headingRuns,
            heading: headingLvl,
            spacing: { before: spaceBefore, after: spaceAfter }
          })
        );
        break;
      }

      // Danh sách (Bullet List hoặc Numbered List)
      case 'list': {
        (token.items || []).forEach((item, idx) => {
          let itemRuns = [];
          if (item.tokens && item.tokens.length > 0) {
            item.tokens.forEach(tok => {
              if (tok.tokens) {
                itemRuns.push(...renderMarkedTokensToRuns(tok.tokens, { size: 22 }));
              } else if (tok.text) {
                itemRuns.push(...parseInlineToRuns(tok.text, { size: 22 }));
              }
            });
          } else {
            itemRuns.push(...parseInlineToRuns(item.text || '', { size: 22 }));
          }

          if (token.ordered) {
            itemRuns.unshift(new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, color: '1E293B', font: 'Arial' }));
            docChildren.push(
              new Paragraph({
                children: itemRuns,
                spacing: { before: 40, after: 60 },
                indent: { left: 400 }
              })
            );
          } else {
            docChildren.push(
              new Paragraph({
                children: itemRuns,
                bullet: { level: 0 },
                spacing: { before: 40, after: 60 }
              })
            );
          }
        });
        break;
      }

      // Bảng so sánh (Table)
      case 'table': {
        const tableRows = [];
        const tableBorders = {
          top: borderThin,
          bottom: borderThin,
          left: borderThin,
          right: borderThin,
          insideHorizontal: borderSubtle,
          insideVertical: borderSubtle
        };

        const colCount = (token.header && token.header.length) || (token.rows[0] ? token.rows[0].length : 2);
        const colWidth = Math.floor(100 / colCount);

        // Header Row
        if (token.header && token.header.length > 0) {
          const headerCells = token.header.map(h => {
            const hRuns = h.tokens
              ? renderMarkedTokensToRuns(h.tokens, { bold: true, size: 20, color: '0F172A' })
              : [new TextRun({ text: h.text, bold: true, size: 20, color: '0F172A', font: 'Arial' })];
            return new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: tableBorders,
              children: [
                new Paragraph({
                  children: hRuns,
                  alignment: AlignmentType.CENTER
                })
              ]
            });
          });
          tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));
        }

        // Data Rows
        if (token.rows && Array.isArray(token.rows)) {
          token.rows.forEach((row, rIdx) => {
            const isEven = rIdx % 2 === 1;
            const dataCells = row.map(cell => {
              const cRuns = cell.tokens
                ? renderMarkedTokensToRuns(cell.tokens, { size: 20, color: '334155' })
                : parseInlineToRuns(cell.text || '', { size: 20, color: '334155' });
              return new TableCell({
                width: { size: colWidth, type: WidthType.PERCENTAGE },
                shading: isEven ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                borders: tableBorders,
                children: [
                  new Paragraph({
                    children: cRuns,
                    alignment: AlignmentType.LEFT
                  })
                ]
              });
            });
            tableRows.push(new TableRow({ children: dataCells }));
          });
        }

        if (tableRows.length > 0) {
          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows
            })
          );
          docChildren.push(new Paragraph({ spacing: { after: 180 } }));
        }
        break;
      }

      // Đoạn văn hoặc Callout ảnh / video
      case 'paragraph': {
        const text = token.text || '';

        // Khối chỉ dẫn ảnh
        if (text.startsWith('[ảnh') || text.startsWith('[Ảnh') || text.includes('[ảnh:') || text.startsWith('![') || text.includes('`[ảnh')) {
          const cleanCaption = text.replace(/[`\[\]!]/g, '').replace(/^(ảnh|Ảnh):\s*/i, '').trim();
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `📷 [Gợi ý ảnh chụp: ${cleanCaption}]`, italics: true, color: '4B5563', size: 20, font: 'Arial' })
              ],
              spacing: { before: 140, after: 140 },
              alignment: AlignmentType.CENTER
            })
          );
        }
        // Khối Video YouTube
        else if (text.includes('Video YouTube') || text.includes('video-container')) {
          const cleanVid = text.replace(/<[^>]*>/g, '').trim();
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: cleanVid, italics: true, color: '1D4ED8', size: 20, font: 'Arial' })
              ],
              spacing: { before: 140, after: 140 },
              alignment: AlignmentType.CENTER
            })
          );
        }
        // Đoạn văn thông thường
        else {
          const pRuns = token.tokens
            ? renderMarkedTokensToRuns(token.tokens, { size: 22, color: '1E293B' })
            : parseInlineToRuns(text, { size: 22, color: '1E293B' });

          docChildren.push(
            new Paragraph({
              children: pRuns,
              spacing: { after: 140, line: 276 },
              alignment: AlignmentType.JUSTIFIED
            })
          );
        }
        break;
      }

      // Trích dẫn / Lưu ý (Blockquote)
      case 'blockquote': {
        const bRuns = token.tokens
          ? renderMarkedTokensToRuns(token.tokens, { italics: true, color: '1E40AF', size: 22 })
          : parseInlineToRuns(token.text || '', { italics: true, color: '1E40AF', size: 22 });

        docChildren.push(
          new Paragraph({
            children: bRuns,
            spacing: { before: 120, after: 120 },
            indent: { left: 400 }
          })
        );
        break;
      }

      // Đường kẻ ngăn cách (HR)
      case 'hr': {
        docChildren.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' }
            },
            spacing: { before: 160, after: 200 }
          })
        );
        break;
      }

      default:
        break;
    }
  }

  // 5. Tạo Document hoàn chỉnh
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: docChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  generateDocxBuffer,
  normalizeContentToMarkdown
};
