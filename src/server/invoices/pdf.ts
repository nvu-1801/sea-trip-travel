import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pdfMakeServer from "pdfmake";
import fontContainer from "pdfmake/build/fonts/Roboto.js";
import {
  formatInvoiceDate,
  formatVnd,
  INVOICE_PAYMENT_LABELS,
  type InvoiceDocument,
} from "@/domain/invoice";

/**
 * A4 invoice PDF.
 *
 * The PDF is generated on demand from the stored document (or the issued
 * snapshot) and streamed to the authenticated admin. Nothing is written to
 * `public/`, and the customer never receives a link to a reusable file.
 *
 * Roboto (bundled with pdfmake) covers Vietnamese. Table headers repeat across
 * pages, rows never split, and long values wrap instead of being clipped.
 */

let configured = false;

function client() {
  if (!configured) {
    for (const [name, entry] of Object.entries(fontContainer.vfs)) {
      pdfMakeServer.virtualfs.writeFileSync(
        name,
        Buffer.from(entry.data, "base64"),
      );
    }
    pdfMakeServer.addFonts(fontContainer.fonts);
    // Fonts are in the virtual file system and the logo is a data URI, so the
    // renderer never needs network or arbitrary local-file access.
    pdfMakeServer.setUrlAccessPolicy(() => false);
    pdfMakeServer.setLocalAccessPolicy(() => false);
    configured = true;
  }
  return pdfMakeServer;
}

let logoData: string | null | undefined;

function logo(): string | null {
  if (logoData !== undefined) return logoData;
  const file = path.resolve(process.cwd(), "public/brand/logo-lockup.png");
  try {
    logoData = existsSync(file)
      ? `data:image/png;base64,${readFileSync(file).toString("base64")}`
      : null;
  } catch {
    logoData = null;
  }
  return logoData;
}

const BRAND = "#c4004e";
const INK = "#211621";
const MUTED = "#6e5c68";
const LINE = "#f2dde7";
const SOFT = "#fff4f8";

function paragraphs(value: string): { text: string }[] {
  return value
    .split(/\r?\n/)
    .map((line) => ({ text: line || " " }));
}

function valueOrDash(value: string): string {
  return value.trim() ? value : "—";
}

function infoRows(
  rows: [string, string][],
): { columns: { text: string }[] }[] {
  return rows
    .filter(([, value]) => value.trim())
    .map(([label, value]) => ({
      columns: [
        { text: `${label}: `, color: MUTED, width: 74 },
        { text: value, color: INK, width: "*" },
      ],
      margin: [0, 1, 0, 1],
    }));
}

function documentTitle(invoice: InvoiceDocument): string {
  return invoice.status === "draft"
    ? "BẢN NHÁP — chưa phát hành"
    : "ĐÃ PHÁT HÀNH";
}

/** Catch a malformed table before pdfmake's less helpful internal error. */
function validateTables(node: unknown, path = "content"): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => validateTables(item, `${path}[${index}]`));
    return;
  }
  const object = node as Record<string, unknown>;
  const table = object.table as
    | { widths?: unknown; body?: unknown }
    | undefined;
  if (table && Array.isArray(table.body) && Array.isArray(table.widths)) {
    const columns = table.widths.length;
    table.body.forEach((row, index) => {
      if (!Array.isArray(row) || row.length !== columns) {
        throw new Error(
          `Bảng hóa đơn không hợp lệ tại ${path}: dòng ${index} có ${
            Array.isArray(row) ? row.length : "?"
          } ô, cần ${columns}`,
        );
      }
    });
  }
  for (const [key, value] of Object.entries(object)) {
    validateTables(value, `${path}.${key}`);
  }
}

export async function buildInvoicePdf(
  invoice: InvoiceDocument,
  options: { draft: boolean },
): Promise<Buffer> {
  const statusColor = options.draft ? "#b54708" : "#067647";
  const statusBg = options.draft ? "#fffaeb" : "#ecfdf3";
  const payment = INVOICE_PAYMENT_LABELS[invoice.paymentStatus];
  const paymentColor =
    invoice.paymentStatus === "paid"
      ? "#067647"
      : invoice.paymentStatus === "partial"
        ? "#b54708"
        : "#b42318";
  const paymentBg =
    invoice.paymentStatus === "paid"
      ? "#ecfdf3"
      : invoice.paymentStatus === "partial"
        ? "#fffaeb"
        : "#fef3f2";

  const sellerLines = [
    { text: "BÊN BÁN", color: BRAND, bold: true, fontSize: 8, characterSpacing: 1 },
    { text: invoice.seller.name, bold: true, fontSize: 12, color: INK, margin: [0, 4, 0, 3] },
    { text: invoice.seller.address, color: MUTED, fontSize: 9 },
    { text: `Điện thoại: ${invoice.seller.phone}`, color: MUTED, fontSize: 9 },
    { text: `Email: ${invoice.seller.email}`, color: MUTED, fontSize: 9 },
  ];

  const buyerLines = [
    { text: "BÊN MUA", color: BRAND, bold: true, fontSize: 8, characterSpacing: 1 },
    { text: invoice.buyer.name, bold: true, fontSize: 12, color: INK, margin: [0, 4, 0, 3] },
    ...(invoice.buyer.company
      ? [{ text: invoice.buyer.company, bold: true, color: INK, fontSize: 9 }]
      : []),
    ...infoRows([
      ["Địa chỉ", invoice.buyer.address],
      ["Mã số thuế", invoice.buyer.taxId],
      ["Điện thoại", invoice.buyer.phone],
      ["Email", invoice.buyer.email],
    ]),
  ];

  const metaRows: [string, string][] = [
    ["Số hóa đơn", invoice.number],
    ["Ngày lập", formatInvoiceDate(invoice.issueDate)],
    ["Hạn thanh toán", invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : "—"],
    [
      "Tour / chương trình",
      valueOrDash(invoice.tourTitle),
    ],
    [
      "Ngày đi dự kiến",
      invoice.travelDate ? formatInvoiceDate(invoice.travelDate) : "—",
    ],
    ["Số khách", invoice.partySize ? `${invoice.partySize} khách` : "—"],
  ];

  const serviceRows = invoice.lines.map((line, index) => [
    { text: String(index + 1), alignment: "center", color: MUTED, fontSize: 8.5 },
    { text: line.description, color: INK, fontSize: 9, wordBreak: "break-all" },
    { text: line.unit || "—", color: MUTED, fontSize: 8.5, alignment: "center" },
    { text: String(line.quantity), alignment: "center", color: INK, fontSize: 9 },
    { text: formatVnd(line.unitPrice), alignment: "right", color: INK, fontSize: 9 },
    { text: formatVnd(line.amount), alignment: "right", bold: true, color: INK, fontSize: 9 },
  ]);

  const totalRows: Record<string, unknown>[][] = [
    [
      { text: "Tạm tính", color: MUTED, fontSize: 9 },
      { text: formatVnd(invoice.subtotal), alignment: "right", color: INK, fontSize: 9 },
    ],
  ];
  if (invoice.discount > 0) {
    totalRows.push([
      { text: "Giảm giá", color: MUTED, fontSize: 9 },
      { text: `- ${formatVnd(invoice.discount)}`, alignment: "right", color: "#b42318", fontSize: 9 },
    ]);
  }
  if (invoice.taxRate > 0) {
    totalRows.push([
      { text: `Thuế (${invoice.taxRate}%)`, color: MUTED, fontSize: 9 },
      { text: formatVnd(invoice.taxAmount), alignment: "right", color: INK, fontSize: 9 },
    ]);
  }
  if (invoice.fee > 0) {
    totalRows.push([
      { text: "Phí khác", color: MUTED, fontSize: 9 },
      { text: formatVnd(invoice.fee), alignment: "right", color: INK, fontSize: 9 },
    ]);
  }
  totalRows.push([
    {
      text: "TỔNG CỘNG",
      bold: true,
      fontSize: 10.5,
      color: INK,
      border: [false, true, false, false],
    },
    {
      text: formatVnd(invoice.total),
      alignment: "right",
      bold: true,
      fontSize: 11,
      color: BRAND,
      border: [false, true, false, false],
    },
  ]);
  totalRows.push([
    { text: "Đã thanh toán", color: MUTED, fontSize: 9, border: [false, true, false, false] },
    {
      text: formatVnd(invoice.paid),
      alignment: "right",
      color: INK,
      fontSize: 9,
      border: [false, true, false, false],
    },
  ]);
  totalRows.push([
    { text: "Còn lại", bold: true, color: INK, fontSize: 9.5 },
    {
      text: formatVnd(invoice.remaining),
      alignment: "right",
      bold: true,
      color: invoice.remaining > 0 ? "#b42318" : "#067647",
      fontSize: 10,
    },
  ]);

  const noteColumns: { stack: Record<string, unknown>[] }[] = [];
  if (invoice.customerNote.trim()) {
    noteColumns.push({
      stack: [
        { text: "GHI CHÚ DÀNH CHO KHÁCH", color: MUTED, bold: true, fontSize: 8, characterSpacing: 1 },
        {
          stack: paragraphs(invoice.customerNote),
          color: INK,
          fontSize: 9,
          margin: [0, 4, 0, 0],
        },
      ],
    });
  }
  if (invoice.bankTransfer.trim()) {
    noteColumns.push({
      stack: [
        { text: "THÔNG TIN CHUYỂN KHOẢN", color: MUTED, bold: true, fontSize: 8, characterSpacing: 1 },
        {
          stack: paragraphs(invoice.bankTransfer),
          color: INK,
          fontSize: 9,
          margin: [0, 4, 0, 0],
        },
        {
          text: `Nội dung chuyển khoản gợi ý: ${invoice.number}`,
          color: MUTED,
          fontSize: 8.5,
          italics: true,
          margin: [0, 4, 0, 0],
        },
      ],
    });
  }
  const noteBlock =
    noteColumns.length > 0
      ? [
          {
            margin: [0, 10, 0, 0],
            table: {
              widths: noteColumns.length === 2 ? ["*", "*"] : ["*"],
              dontBreakRows: true,
              body: [noteColumns.map((column) => ({ stack: column.stack }))],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 10,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
          },
        ]
      : [];

  const definition: Record<string, unknown> = {
    pageSize: "A4",
    pageMargins: [42, 50, 42, 62],
    compress: true,
    info: {
      title: `Hóa đơn ${invoice.number}`,
      author: invoice.seller.name,
      subject: "Hóa đơn thương mại / đề nghị thanh toán",
      creator: invoice.seller.name,
    },
    ...(options.draft
      ? {
          watermark: {
            text: "BẢN NHÁP",
            color: BRAND,
            opacity: 0.055,
            fontSize: 54,
            bold: true,
            italics: false,
          },
        }
      : {}),
    header: (currentPage: number) =>
      currentPage === 1
        ? { text: "" }
        : {
            margin: [42, 24, 42, 0],
            columns: [
              {
                text: invoice.seller.name,
                bold: true,
                fontSize: 8,
                color: BRAND,
                characterSpacing: 1,
              },
              {
                text: `${invoice.number} · ${documentTitle(invoice)}`,
                alignment: "right",
                color: MUTED,
                fontSize: 7.5,
              },
            ],
          },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [42, 12, 42, 0],
      stack: [
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.5, lineColor: LINE },
          ],
        },
        {
          margin: [0, 6, 0, 0],
          columns: [
            {
              text: "Hóa đơn thương mại / đề nghị thanh toán nội bộ — Không thay thế hóa đơn điện tử hợp pháp hoặc hóa đơn GTGT.",
              color: MUTED,
              fontSize: 7.5,
              width: "*",
            },
            {
              text: `Trang ${currentPage}/${pageCount}`,
              alignment: "right",
              color: MUTED,
              fontSize: 7.5,
              width: 70,
            },
          ],
        },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: 190,
            ...(logo()
              ? { image: logo(), fit: [150, 104] }
              : {
                  stack: [
                    { text: invoice.seller.name, bold: true, fontSize: 16, color: BRAND },
                    { text: invoice.seller.address, color: MUTED, fontSize: 8 },
                  ],
                }),
          },
          {
            width: "*",
            alignment: "right",
            stack: [
              { text: "HÓA ĐƠN THƯƠNG MẠI", bold: true, fontSize: 19, color: INK },
              {
                text: "ĐỀ NGHỊ THANH TOÁN",
                bold: true,
                fontSize: 10,
                color: BRAND,
                characterSpacing: 1.2,
                margin: [0, 2, 0, 0],
              },
              { text: invoice.number, bold: true, fontSize: 10, color: INK, margin: [0, 6, 0, 0] },
              {
                text: "Tài liệu xác nhận dịch vụ và đề nghị thanh toán. Không thay thế hóa đơn điện tử hợp pháp.",
                color: MUTED,
                fontSize: 8,
                margin: [0, 6, 0, 0],
              },
              {
                margin: [0, 8, 0, 0],
                columns: [
                  { width: "*", text: "" },
                  {
                    width: 150,
                    table: {
                      widths: ["*"],
                      body: [[{ text: documentTitle(invoice), color: statusColor, bold: true, fontSize: 8, alignment: "center", fillColor: statusBg, margin: [4, 4, 4, 4] }]],
                    },
                    layout: "noBorders",
                  },
                ],
              },
              {
                margin: [0, 4, 0, 0],
                columns: [
                  { width: "*", text: "" },
                  {
                    width: 150,
                    table: {
                      widths: ["*"],
                      body: [[{ text: `Thanh toán: ${payment}`, color: paymentColor, bold: true, fontSize: 8, alignment: "center", fillColor: paymentBg, margin: [4, 4, 4, 4] }]],
                    },
                    layout: "noBorders",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        margin: [0, 12, 0, 0],
        table: {
          widths: ["*", "*"],
          body: [
            [
              { stack: sellerLines, fillColor: SOFT, margin: [10, 9, 10, 9] },
              { stack: buyerLines, fillColor: "#ffffff", margin: [10, 9, 10, 9] },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => LINE,
          vLineColor: () => LINE,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      {
        margin: [0, 10, 0, 0],
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                stack: metaRows.slice(0, 3).map(([label, value]) => ({
                  columns: [
                    { text: `${label}: `, color: MUTED, fontSize: 8.5, width: 82 },
                    {
                      text: value,
                      color: INK,
                      fontSize: 8.5,
                      bold: true,
                      width: "*",
                    },
                  ],
                  margin: [0, 1, 0, 1],
                })),
              },
              {
                stack: metaRows.slice(3).map(([label, value]) => ({
                  columns: [
                    { text: `${label}: `, color: MUTED, fontSize: 8.5, width: 82 },
                    { text: value, color: INK, fontSize: 8.5, width: "*" },
                  ],
                  margin: [0, 1, 0, 1],
                })),
              },
            ],
          ],
        },
        layout: "noBorders",
      },
      {
        margin: [0, 14, 0, 0],
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [22, "*", 40, 34, 78, 86],
          body: [
            [
              { text: "STT", bold: true, fontSize: 8, color: INK, alignment: "center", fillColor: "#fdeaf2" },
              { text: "DỊCH VỤ", bold: true, fontSize: 8, color: INK, fillColor: "#fdeaf2" },
              { text: "ĐVT", bold: true, fontSize: 8, color: INK, alignment: "center", fillColor: "#fdeaf2" },
              { text: "SL", bold: true, fontSize: 8, color: INK, alignment: "center", fillColor: "#fdeaf2" },
              { text: "ĐƠN GIÁ", bold: true, fontSize: 8, color: INK, alignment: "right", fillColor: "#fdeaf2" },
              { text: "THÀNH TIỀN", bold: true, fontSize: 8, color: INK, alignment: "right", fillColor: "#fdeaf2" },
            ],
            ...serviceRows,
          ],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? BRAND : LINE,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? "#fdeaf2" : rowIndex % 2 === 0 ? "#fffafc" : null,
        },
      },
      ...noteBlock,
      {
        margin: [0, 10, 0, 0],
        table: {
          widths: ["*", 250],
          body: [
            [
              {
                verticalAlign: "top",
                stack: [
                  {
                    table: {
                      widths: ["*"],
                      body: [[{ text: `Thanh toán: ${payment}`, color: paymentColor, bold: true, fontSize: 9, fillColor: paymentBg, margin: [8, 6, 8, 6] }]],
                    },
                    layout: "noBorders",
                  },
                ],
              },
              {
                verticalAlign: "top",
                table: {
                  widths: ["*", "auto"],
                  body: totalRows,
                },
                layout: {
                  hLineWidth: (i: number) => (i === 0 ? 0.5 : 0),
                  vLineWidth: () => 0,
                  hLineColor: () => LINE,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 3,
                  paddingBottom: () => 3,
                },
              },
            ],
          ],
        },
        layout: "noBorders",
      },
    ],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: INK,
      lineHeight: 1.25,
    },
  };

  validateTables(definition);
  return client().createPdf(definition).getBuffer();
}
