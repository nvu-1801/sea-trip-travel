"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CloseIcon } from "@/components/ui/icons";
import { AdminDatePicker } from "./admin-date-picker";
import { AdminIcon } from "./admin-icons";
import type { ConfirmRequest, ToastKind } from "./notify";
import {
  calculateInvoice,
  formatVnd,
  INVOICE_PAYMENT_LABELS,
  INVOICE_STATUS_LABELS,
  type InvoiceDocument,
} from "@/domain/invoice";
import type { InvoiceInput } from "@/domain/invoice-schema";

/**
 * Invoice editor for a consultation request.
 *
 * The form is intentionally plain: staff can see every value before it becomes
 * a PDF. Money totals are only a preview; the API recalculates them from the
 * lines, discount, tax and payment inputs. Saving a draft and downloading a PDF
 * never mark the invoice as paid.
 */

export type InvoiceLead = {
  id: string;
  requestId: string;
  fullName: string;
  phone: string;
  email: string;
  tourTitle: string;
  interest: string;
  travelDate: string;
  partySize: string;
};

type Props = {
  lead: InvoiceLead;
  invoiceId: string | null;
  csrf: string;
  onClose: () => void;
  onSaved: (invoice: InvoiceDocument) => void;
  notify: (kind: ToastKind, text: string) => void;
  confirm: (request: Exclude<ConfirmRequest, null>) => Promise<boolean>;
};

type FormLine = {
  key: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

type FormState = {
  issueDate: string;
  dueDate: string;
  buyerName: string;
  buyerCompany: string;
  buyerAddress: string;
  buyerTaxId: string;
  buyerPhone: string;
  buyerEmail: string;
  tourTitle: string;
  travelDate: string;
  partySize: string;
  lines: FormLine[];
  discount: string;
  taxRate: string;
  fee: string;
  paid: string;
  customerNote: string;
  bankTransfer: string;
};

function todayInVietnam(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function lineKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function digits(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 15);
}

function numberOrZero(value: string): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function emptyForm(lead: InvoiceLead): FormState {
  const tour = lead.tourTitle || lead.interest || "Dịch vụ tư vấn tour";
  return {
    issueDate: todayInVietnam(),
    dueDate: "",
    buyerName: lead.fullName,
    buyerCompany: "",
    buyerAddress: "",
    buyerTaxId: "",
    buyerPhone: lead.phone,
    buyerEmail: lead.email,
    tourTitle: lead.tourTitle || lead.interest,
    travelDate: lead.travelDate,
    partySize: lead.partySize,
    lines: [
      {
        key: lineKey(),
        description: tour,
        unit: "khách",
        quantity: lead.partySize || "1",
        unitPrice: "",
      },
    ],
    discount: "0",
    taxRate: "0",
    fee: "0",
    paid: "0",
    customerNote: "",
    bankTransfer: "",
  };
}

function formFromInvoice(invoice: InvoiceDocument): FormState {
  return {
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    buyerName: invoice.buyer.name,
    buyerCompany: invoice.buyer.company,
    buyerAddress: invoice.buyer.address,
    buyerTaxId: invoice.buyer.taxId,
    buyerPhone: invoice.buyer.phone,
    buyerEmail: invoice.buyer.email,
    tourTitle: invoice.tourTitle,
    travelDate: invoice.travelDate,
    partySize: invoice.partySize ? String(invoice.partySize) : "",
    lines: invoice.lines.map((line) => ({
      key: lineKey(),
      description: line.description,
      unit: line.unit,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
    })),
    discount: String(invoice.discount),
    taxRate: String(invoice.taxRate),
    fee: String(invoice.fee),
    paid: String(invoice.paid),
    customerNote: invoice.customerNote,
    bankTransfer: invoice.bankTransfer,
  };
}

function payloadFrom(form: FormState): InvoiceInput {
  return {
    issueDate: form.issueDate,
    dueDate: form.dueDate || undefined,
    buyer: {
      name: form.buyerName,
      company: form.buyerCompany,
      address: form.buyerAddress,
      taxId: form.buyerTaxId,
      phone: form.buyerPhone,
      email: form.buyerEmail,
    },
    tourTitle: form.tourTitle,
    travelDate: form.travelDate || undefined,
    partySize: form.partySize.trim() ? Number(form.partySize) : null,
    lines: form.lines.map((line) => ({
      description: line.description,
      unit: line.unit || "lượt",
      quantity: Number(line.quantity),
      unitPrice: numberOrZero(line.unitPrice),
    })),
    discount: numberOrZero(form.discount),
    taxRate: numberOrZero(form.taxRate),
    fee: numberOrZero(form.fee),
    paid: numberOrZero(form.paid),
    customerNote: form.customerNote,
    bankTransfer: form.bankTransfer,
  };
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`adm-inv-field${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="adm-inv-money">
      <input
        inputMode="numeric"
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        onChange={(event) => onChange(digits(event.target.value))}
      />
      <span>₫</span>
    </div>
  );
}

export function InvoiceEditor({
  lead,
  invoiceId,
  csrf,
  onClose,
  onSaved,
  notify,
  confirm,
}: Props) {
  const [initial] = useState(() => emptyForm(lead));
  const [form, setForm] = useState<FormState>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [invoice, setInvoice] = useState<InvoiceDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(invoiceId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createToken] = useState(() =>
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${lineKey()}-${lineKey()}`,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});

  const request = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(`/api/admin/${url}`, {
        ...options,
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
          ...options.headers,
        },
      });
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        if (response.status === 401) {
          window.location.replace("/admin/login?expired=1");
        }
        throw new Error(
          typeof body.error === "string" ? body.error : "Có lỗi xảy ra",
        );
      }
      return body;
    },
    [csrf],
  );

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    request(`invoices/${invoiceId}`)
      .then((body) => {
        if (cancelled) return;
        const loaded = body.invoice as InvoiceDocument;
        const next = formFromInvoice(loaded);
        setInvoice(loaded);
        setForm(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Không tải được hóa đơn",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId, request]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const preview = useMemo(() => {
    try {
      return { calculation: calculateInvoice(payloadFrom(form)), error: "" };
    } catch (reason) {
      return {
        calculation: null,
        error:
          reason instanceof Error ? reason.message : "Dữ liệu chưa hợp lệ",
      };
    }
  }, [form]);

  const readOnly = invoice?.status === "issued";
  const dirty = !readOnly && JSON.stringify(form) !== baseline;

  async function handleClose() {
    if (saving) return;
    if (dirty) {
      const ok = await confirm({
        title: "Đóng hóa đơn?",
        body: "Thay đổi chưa lưu sẽ bị bỏ. Bản đã lưu trên server vẫn giữ nguyên.",
        confirmLabel: "Đóng",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  }
  useEffect(() => {
    closeRef.current = () => void handleClose();
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A confirm dialog or the portal date picker owns these keys.
      if (document.querySelector(".adm-modal-veil, .adm-date-pop")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") && element.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function saveDraft(): Promise<InvoiceDocument | null> {
    if (saving) return invoice;
    if (preview.error) {
      setError(preview.error);
      notify("error", preview.error);
      return null;
    }
    setSaving(true);
    setError("");
    try {
      const payload = payloadFrom(form);
      const body = invoice
        ? await request(`invoices/${invoice.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...payload, revision: invoice.revision }),
          })
        : await request("invoices", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              leadId: lead.id,
              createToken,
            }),
          });
      const saved = body.invoice as InvoiceDocument;
      const next = formFromInvoice(saved);
      setInvoice(saved);
      setForm(next);
      setBaseline(JSON.stringify(next));
      onSaved(saved);
      notify(
        "success",
        invoice ? "Đã cập nhật hóa đơn." : "Đã lưu hóa đơn nháp.",
      );
      return saved;
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Không lưu được hóa đơn";
      setError(message);
      notify("error", message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function previewPdf() {
    const win = window.open("about:blank", "_blank");
    if (win) {
      win.document.write(
        "<p style=\"font:14px system-ui;padding:24px;color:#6e5c68\">Đang tạo bản xem trước…</p>",
      );
      win.document.close();
      win.opener = null;
    }
    const saved = await saveDraft();
    if (!saved) {
      win?.close();
      return;
    }
    const url = `/api/admin/invoices/${saved.id}/pdf?disposition=inline`;
    if (win) win.location.href = url;
    else {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  }

  async function downloadPdf() {
    const saved = await saveDraft();
    if (!saved) return;
    const link = document.createElement("a");
    link.href = `/api/admin/invoices/${saved.id}/pdf`;
    link.download = `Hoa-don-${saved.number}.pdf`;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function issue() {
    if (!invoice && !preview.calculation) return;
    const ok = await confirm({
      title: "Phát hành hóa đơn này?",
      body: "Sau khi phát hành, số hóa đơn và toàn bộ nội dung sẽ được khóa. Muốn điều chỉnh sau đó phải lập hóa đơn mới.",
      confirmLabel: "Phát hành",
      danger: false,
    });
    if (!ok) return;
    setError("");
    const saved = await saveDraft();
    if (!saved) return;
    setSaving(true);
    try {
      const body = await request(`invoices/${saved.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "issue", revision: saved.revision }),
      });
      const issued = body.invoice as InvoiceDocument;
      const next = formFromInvoice(issued);
      setInvoice(issued);
      setForm(next);
      setBaseline(JSON.stringify(next));
      onSaved(issued);
      notify("success", `Đã phát hành hóa đơn ${issued.number}.`);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Không phát hành được hóa đơn";
      setError(message);
      notify("error", message);
    } finally {
      setSaving(false);
    }
  }

  const calculation = preview.calculation;
  const paymentStatus = invoice?.paymentStatus ?? calculation?.paymentStatus ?? "unpaid";
  const status = invoice?.status ?? "draft";

  return (
    <div
      className="adm-inv-veil"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void handleClose();
      }}
    >
      <div
        className="adm-inv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-inv-title"
        aria-describedby="adm-inv-subtitle"
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="adm-inv-head">
          <div className="adm-inv-head-main">
            <p className="adm-eyebrow">Hóa đơn thương mại</p>
            <h2 id="adm-inv-title">
              {invoice?.number ?? "Hóa đơn mới"}
              <span className="adm-inv-badge" data-tone={status}>
                {INVOICE_STATUS_LABELS[status]}
              </span>
            </h2>
            <p id="adm-inv-subtitle">
              {lead.fullName}
              {lead.requestId ? ` · Yêu cầu #${lead.requestId}` : ""}
              {lead.phone ? ` · ${lead.phone}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="adm-inv-close"
            aria-label="Đóng biểu mẫu hóa đơn"
            onClick={() => void handleClose()}
            disabled={saving}
          >
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        {loading ? (
          <div className="adm-inv-loading" role="status">
            Đang tải hóa đơn…
          </div>
        ) : (
          <div className="adm-inv-body">
            <div className="adm-inv-main">
              {readOnly ? (
                <div className="adm-inv-lock" role="status">
                  <AdminIcon name="shield" size={17} />
                  <p>
                    Hóa đơn đã phát hành. Nội dung được khóa theo bản chụp đã
                    lưu; tải PDF luôn dùng đúng bản chụp này.
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="adm-inv-error" role="alert">
                  {error}
                </p>
              ) : null}

              <section className="adm-inv-section">
                <div className="adm-inv-section-head">
                  <h3>Thông tin hóa đơn</h3>
                  <span>Thay đổi tại đây chỉ áp dụng cho hóa đơn</span>
                </div>
                <div className="adm-inv-grid">
                  <div className="adm-inv-field">
                    <span>Ngày lập</span>
                    <AdminDatePicker
                      value={form.issueDate}
                      disabled={readOnly || saving}
                      onChange={(value) =>
                        setForm({ ...form, issueDate: value })
                      }
                    />
                  </div>
                  <div className="adm-inv-field">
                    <span>Hạn thanh toán</span>
                    <AdminDatePicker
                      value={form.dueDate}
                      disabled={readOnly || saving}
                      onChange={(value) => setForm({ ...form, dueDate: value })}
                    />
                    <small>Để trống nếu chưa thỏa thuận</small>
                  </div>
                  <Field label="Tour / chương trình" className="adm-inv-field--wide">
                    <input
                      value={form.tourTitle}
                      disabled={readOnly || saving}
                      placeholder="VD: Quy Nhơn – Kỳ Co – Eo Gió 1 ngày"
                      onChange={(event) =>
                        setForm({ ...form, tourTitle: event.target.value })
                      }
                    />
                  </Field>
                  <div className="adm-inv-field">
                    <span>Ngày đi dự kiến</span>
                    <AdminDatePicker
                      value={form.travelDate}
                      disabled={readOnly || saving}
                      onChange={(value) =>
                        setForm({ ...form, travelDate: value })
                      }
                    />
                  </div>
                  <Field label="Số khách">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.partySize}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, partySize: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <p className="adm-inv-note">
                  Thông tin tour, ngày đi và số khách được điền từ yêu cầu gốc.
                  Sửa ở đây không làm thay đổi yêu cầu tư vấn.
                </p>
              </section>

              <section className="adm-inv-section">
                <div className="adm-inv-section-head">
                  <h3>Bên mua</h3>
                  <span>Tên công ty, địa chỉ và mã số thuế là tùy chọn</span>
                </div>
                <div className="adm-inv-grid">
                  <Field label="Họ tên khách hàng">
                    <input
                      value={form.buyerName}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Tên công ty">
                    <input
                      value={form.buyerCompany}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerCompany: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Mã số thuế">
                    <input
                      value={form.buyerTaxId}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerTaxId: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Điện thoại">
                    <input
                      value={form.buyerPhone}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerPhone: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.buyerEmail}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerEmail: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Địa chỉ" className="adm-inv-field--wide">
                    <input
                      value={form.buyerAddress}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, buyerAddress: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </section>

              <section className="adm-inv-section">
                <div className="adm-inv-section-head">
                  <h3>Dịch vụ</h3>
                  <span>Cộng tiền theo số lượng × đơn giá</span>
                </div>
                <div className="adm-inv-lines" role="table" aria-label="Các dòng dịch vụ">
                  <div className="adm-inv-lines-head" role="row">
                    <span>Dịch vụ</span>
                    <span>ĐVT</span>
                    <span>SL</span>
                    <span>Đơn giá</span>
                    <span>Thành tiền</span>
                    <span aria-hidden="true" />
                  </div>
                  {form.lines.map((line, index) => {
                    const amount =
                      Number(line.quantity || 0) * numberOrZero(line.unitPrice);
                    return (
                      <div className="adm-inv-line" role="row" key={line.key}>
                        <label className="adm-inv-line-desc">
                          <span>Dịch vụ</span>
                          <input
                            value={line.description}
                            disabled={readOnly || saving}
                            placeholder="Tên dịch vụ"
                            onChange={(event) => {
                              const lines = [...form.lines];
                              lines[index] = {
                                ...line,
                                description: event.target.value,
                              };
                              setForm({ ...form, lines });
                            }}
                          />
                        </label>
                        <label>
                          <span>ĐVT</span>
                          <input
                            value={line.unit}
                            disabled={readOnly || saving}
                            placeholder="khách"
                            onChange={(event) => {
                              const lines = [...form.lines];
                              lines[index] = {
                                ...line,
                                unit: event.target.value,
                              };
                              setForm({ ...form, lines });
                            }}
                          />
                        </label>
                        <label>
                          <span>SL</span>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={line.quantity}
                            disabled={readOnly || saving}
                            onChange={(event) => {
                              const lines = [...form.lines];
                              lines[index] = {
                                ...line,
                                quantity: event.target.value,
                              };
                              setForm({ ...form, lines });
                            }}
                          />
                        </label>
                        <label>
                          <span>Đơn giá</span>
                          <MoneyInput
                            value={line.unitPrice}
                            disabled={readOnly || saving}
                            placeholder="Nhập giá thực tế"
                            onChange={(value) => {
                              const lines = [...form.lines];
                              lines[index] = { ...line, unitPrice: value };
                              setForm({ ...form, lines });
                            }}
                          />
                        </label>
                        <div className="adm-inv-line-total">
                          <span>Thành tiền</span>
                          <strong>{formatVnd(amount)}</strong>
                        </div>
                        <button
                          type="button"
                          className="adm-inv-line-remove"
                          aria-label={`Xóa dòng ${index + 1}`}
                          disabled={
                            readOnly || saving || form.lines.length === 1
                          }
                          onClick={() =>
                            setForm({
                              ...form,
                              lines: form.lines.filter(
                                (item) => item.key !== line.key,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="adm-inv-add"
                  disabled={readOnly || saving || form.lines.length >= 100}
                  onClick={() =>
                    setForm({
                      ...form,
                      lines: [
                        ...form.lines,
                        {
                          key: lineKey(),
                          description: "",
                          unit: "lượt",
                          quantity: "1",
                          unitPrice: "",
                        },
                      ],
                    })
                  }
                >
                  <AdminIcon name="plus" size={14} /> Thêm dòng dịch vụ
                </button>
                <p className="adm-inv-note">
                  Không tự điền giá tour. Nhập đơn giá thực tế đã thỏa thuận với
                  khách; hệ thống kiểm tra lại toàn bộ phép tính khi lưu.
                </p>
              </section>

              <section className="adm-inv-section">
                <div className="adm-inv-section-head">
                  <h3>Giảm giá, thuế và thanh toán</h3>
                  <span>Chỉ nhập số tiền thực tế</span>
                </div>
                <div className="adm-inv-grid adm-inv-grid--money">
                  <Field label="Giảm giá" hint="Không lớn hơn tạm tính">
                    <MoneyInput
                      value={form.discount}
                      disabled={readOnly || saving}
                      onChange={(value) => setForm({ ...form, discount: value })}
                    />
                  </Field>
                  <Field label="Thuế / phí (%)" hint="Ví dụ 8 = 8%">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.taxRate}
                      disabled={readOnly || saving}
                      onChange={(event) =>
                        setForm({ ...form, taxRate: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Phí khác" hint="Khoản cộng thêm đã thỏa thuận">
                    <MoneyInput
                      value={form.fee}
                      disabled={readOnly || saving}
                      onChange={(value) => setForm({ ...form, fee: value })}
                    />
                  </Field>
                  <Field
                    label="Đã thanh toán / đặt cọc"
                    hint="Không đánh dấu đã thanh toán khi chỉ tải PDF"
                  >
                    <MoneyInput
                      value={form.paid}
                      disabled={readOnly || saving}
                      onChange={(value) => setForm({ ...form, paid: value })}
                    />
                  </Field>
                </div>
                <p className="adm-inv-note">
                  Thuế được tính trên tạm tính sau giảm giá và làm tròn đến
                  đồng. Trạng thái thanh toán được suy ra từ số tiền đã nhập.
                </p>
              </section>

              <section className="adm-inv-section">
                <div className="adm-inv-section-head">
                  <h3>Ghi chú và chuyển khoản</h3>
                  <span>Chỉ hiển thị trên hóa đơn, không sửa yêu cầu gốc</span>
                </div>
                <div className="adm-inv-grid">
                  <Field
                    label="Ghi chú dành cho khách"
                    className="adm-inv-field--wide"
                  >
                    <textarea
                      rows={3}
                      value={form.customerNote}
                      disabled={readOnly || saving}
                      placeholder="VD: Vui lòng xác nhận trước 3 ngày…"
                      onChange={(event) =>
                        setForm({ ...form, customerNote: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Thông tin chuyển khoản"
                    className="adm-inv-field--wide"
                    hint="Không tự tạo số tài khoản; chỉ nhập thông tin đã xác nhận"
                  >
                    <textarea
                      rows={3}
                      value={form.bankTransfer}
                      disabled={readOnly || saving}
                      placeholder="VD: Ngân hàng… · Số tài khoản… · Chủ tài khoản…"
                      onChange={(event) =>
                        setForm({ ...form, bankTransfer: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </section>
            </div>

            <aside className="adm-inv-summary" aria-label="Tóm tắt hóa đơn">
              <div className="adm-inv-summary-card">
                <div className="adm-inv-summary-top">
                  <div>
                    <p className="adm-eyebrow">Tóm tắt</p>
                    <strong>{invoice?.number ?? "Số tự sinh khi lưu"}</strong>
                  </div>
                  <span className="adm-inv-badge" data-tone={status}>
                    {INVOICE_STATUS_LABELS[status]}
                  </span>
                </div>
                <span
                  className="adm-inv-payment"
                  data-payment={paymentStatus}
                >
                  {INVOICE_PAYMENT_LABELS[paymentStatus]}
                </span>
                <dl className="adm-inv-totals">
                  <div>
                    <dt>Tạm tính</dt>
                    <dd>{formatVnd(calculation?.subtotal ?? 0)}</dd>
                  </div>
                  {(calculation?.discount ?? 0) > 0 ? (
                    <div>
                      <dt>Giảm giá</dt>
                      <dd className="adm-inv-negative">
                        - {formatVnd(calculation?.discount ?? 0)}
                      </dd>
                    </div>
                  ) : null}
                  {(calculation?.taxAmount ?? 0) > 0 ? (
                    <div>
                      <dt>Thuế ({calculation?.taxRate ?? 0}%)</dt>
                      <dd>{formatVnd(calculation?.taxAmount ?? 0)}</dd>
                    </div>
                  ) : null}
                  {(calculation?.fee ?? 0) > 0 ? (
                    <div>
                      <dt>Phí khác</dt>
                      <dd>{formatVnd(calculation?.fee ?? 0)}</dd>
                    </div>
                  ) : null}
                  <div className="adm-inv-grand-total">
                    <dt>Tổng cộng</dt>
                    <dd>{formatVnd(calculation?.total ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Đã thanh toán</dt>
                    <dd>{formatVnd(calculation?.paid ?? 0)}</dd>
                  </div>
                  <div className="adm-inv-remaining">
                    <dt>Còn lại</dt>
                    <dd>{formatVnd(calculation?.remaining ?? 0)}</dd>
                  </div>
                </dl>

                {preview.error ? (
                  <p className="adm-inv-preview-error" role="alert">
                    {preview.error}
                  </p>
                ) : null}

                <div className="adm-inv-seller">
                  <span>Bên bán</span>
                  <strong>{invoice?.seller.name ?? "SEA TRIP TRAVEL"}</strong>
                  {invoice ? (
                    <>
                      <small>{invoice.seller.address}</small>
                      <small>{invoice.seller.phone}</small>
                      <small>{invoice.seller.email}</small>
                    </>
                  ) : (
                    <small>Thông tin bên bán lấy từ Website &amp; footer khi lưu.</small>
                  )}
                </div>

                <p className="adm-inv-hint">
                  Tải hóa đơn PDF, sau đó đính kèm vào thư Gmail để gửi cho
                  khách. Website không tự đính kèm tệp vào liên kết Gmail.
                </p>
                <p className="adm-inv-disclaimer">
                  Hóa đơn thương mại / đề nghị thanh toán nội bộ. Không thay thế
                  hóa đơn điện tử hợp pháp.
                </p>
              </div>
            </aside>
          </div>
        )}

        <footer className="adm-inv-actions">
          <button
            type="button"
            className="adm-inv-ghost adm-inv-footer-close"
            onClick={() => void handleClose()}
            disabled={saving}
          >
            Đóng
          </button>
          <div className="adm-inv-actions-right">
            {!readOnly ? (
              <button
                type="button"
                className="adm-inv-ghost"
                onClick={() => void saveDraft()}
                disabled={saving || loading || Boolean(preview.error)}
              >
                {saving ? "Đang lưu…" : "Lưu nháp"}
              </button>
            ) : null}
            <button
              type="button"
              className="adm-inv-ghost"
              onClick={() => void previewPdf()}
              disabled={saving || loading}
            >
              Xem trước
            </button>
            <button
              type="button"
              className="adm-inv-ghost"
              onClick={() => void downloadPdf()}
              disabled={saving || loading}
            >
              Tải PDF
            </button>
            {!readOnly ? (
              <button
                type="button"
                className="adm-inv-primary"
                onClick={() => void issue()}
                disabled={
                  saving ||
                  loading ||
                  Boolean(preview.error) ||
                  (calculation?.total ?? 0) <= 0
                }
                title={
                  (calculation?.total ?? 0) <= 0
                    ? "Nhập đơn giá và kiểm tra tổng tiền trước khi phát hành"
                    : "Khóa nội dung và phát hành hóa đơn"
                }
              >
                <AdminIcon name="check" size={14} /> Phát hành
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}


