'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { getLocalDateString, getLocalTimeString, formatDateDisplay } from '../../lib/utils/date';
import { Button } from './Button';
import { Modal } from './Modal';

function InvoicePrintContent({ data, clinicInfo, printTime }: { data: any; clinicInfo: any; printTime?: string }) {
  const items = data.items?.length
    ? data.items
    : [{ name: data.serviceName, price: data.amount, quantity: 1 }];

  const subtotal = data.subtotal ?? data.amount ?? 0;
  const tax = data.tax ?? 0;
  const discount = data.discount ?? 0;
  const netAmount = data.grandTotal ?? Math.max(0, subtotal + tax - discount);

  const amountPaid = data.amountPaid !== undefined && data.amountPaid !== null ? data.amountPaid : netAmount;
  const remainingDue = data.remainingDue !== undefined && data.remainingDue !== null ? data.remainingDue : Math.max(0, netAmount - amountPaid);
  const isPartial = remainingDue > 0;
  const isRefunded = (data.status || '').toLowerCase() === 'refunded' || (data.paymentStatus || '').toLowerCase() === 'refunded';

  const paymentMethod = data.paymentMethod || 'Cash';
  const isCash = paymentMethod.toLowerCase() === 'cash';
  const cashReceived = data.cashReceived ?? (isCash ? amountPaid : 0);
  const cashReturned = data.cashReturned ?? Math.max(cashReceived - amountPaid, 0);

  // Calculate discount percentage if discount amount and subtotal are provided
  const discountPercent = data.discountPercent ?? (subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0);

  // Always use the exact time from the clock system at that time
  const displayTime = printTime || getLocalTimeString();

  return (
    <div className="space-y-0 text-[13px] text-slate-900 font-mono">
      {/* Refunded or Duplicate Watermark */}
      {isRefunded && (
        <div className="my-2 py-2 px-2 border-2 border-dashed border-rose-600 bg-rose-50 text-rose-700 text-center font-black text-xs tracking-wider uppercase rounded">
          *** TRANSACTION VOIDED / REFUNDED ***
        </div>
      )}
      {Boolean(data.reprintCount && data.reprintCount > 0) && !isRefunded && (
        <div className="my-2 py-1.5 px-2 border-2 border-dashed border-red-600 bg-red-50 text-red-700 text-center font-black text-xs tracking-wider uppercase rounded">
          *** DUPLICATE REPRINT (Copy #{data.reprintCount}) ***
        </div>
      )}

      {/* Date / Time */}
      <div className="flex justify-between font-bold pb-3 pt-2">
        <span>Date: <span className="font-normal">{data.date ? formatDateDisplay(data.date) : formatDateDisplay(getLocalDateString())}</span></span>
        <span>Time: <span className="font-normal">{displayTime}</span></span>
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Customer Info */}
      <div className="pt-3 pb-3 space-y-1">
        <p className="font-black font-bold uppercase tracking-wide">Customer Info</p>
        <p>Name : <span className="font-bold">{data.clientName || 'Valued Client'}</span></p>
        {data.phone && <p>Phone : <span className="font-bold">{data.phone}</span></p>}
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Invoice Details */}
      <div className="pt-3 pb-3 space-y-1">
        <p className="font-black uppercase tracking-wide">Invoice Details</p>
        <p>Invoice No : <span className="font-bold">{data.invoiceId || data.id || `INV-${Date.now().toString().slice(-6)}`}</span></p>
        <p>Payment Tender : <span className="font-bold uppercase">{paymentMethod}</span></p>
        {data.bankTxnId && (
          <p className="text-[11px] text-slate-700">Ref / Slip # : <span className="font-bold">{data.bankTxnId}</span></p>
        )}
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Service Table */}
      <div className="pt-3">
        <div className="bg-slate-950 text-white flex justify-between px-3 py-2 rounded-md font-bold uppercase text-[11px] tracking-wide">
          <span className="w-1/3">Service / Item</span>
          <span className="w-1/3 text-center">Qty</span>
          <span className="w-1/3 text-right">Amount</span>
        </div>
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between px-3 py-2 text-slate-800">
            <span className="w-1/3 truncate">{item.name}</span>
            <span className="w-1/3 text-center">{item.quantity}</span>
            <span className="w-1/3 text-right">{formatPKR(item.price * (item.quantity || 1))}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-slate-400 mt-2" />

      {/* Totals */}
      <div className="pt-2 space-y-1.5">
        <div className="flex justify-end px-3 gap-10">
          <span className="font-bold w-32">Subtotal</span>
          <span className="w-24 text-right">{formatPKR(subtotal)}</span>
        </div>
        <div className="flex justify-end px-3 gap-10">
          <span className="w-32">GST ({data.taxPercent ?? 0}%)</span>
          <span className="w-24 text-right">{formatPKR(tax)}</span>
        </div>
        <div className="flex justify-end px-3 gap-10">
          <span className="w-32">Discount ({discountPercent}%)</span>
          <span className="w-24 text-right">-{formatPKR(discount)}</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <div className="w-70 border-t border-dashed border-slate-400" />
      </div>

      {/* Net Amount & Payment Allocation */}
      <div className="pt-2 space-y-1.5">
        <div className="bg-slate-950 text-white flex justify-between px-3 py-2 rounded-md mt-1">
          <span className="font-black w-32">Net Amount</span>
          <span className="w-24 text-right font-black">{formatPKR(netAmount)}</span>
        </div>

        {/* Split Payment Tender Details if applicable */}
        {data.paymentSplits && data.paymentSplits.length > 0 ? (
          <div className="pt-1 pb-1 space-y-1 border-t border-dashed border-slate-300">
            <p className="font-bold text-[11px] uppercase text-slate-700">Split Tender Breakdown:</p>
            {data.paymentSplits.map((split: any, idx: number) => (
              <div key={idx} className="flex justify-between px-3 text-xs">
                <span>{split.method} Tender:</span>
                <span className="font-bold font-mono">{formatPKR(split.amount)}</span>
              </div>
            ))}
          </div>
        ) : isCash ? (
          <>
            <div className="flex justify-end px-3 gap-10">
              <span className="w-32">Cash Tendered</span>
              <span className="w-24 text-right font-bold">{formatPKR(cashReceived)}</span>
            </div>
            {cashReturned > 0 && (
              <div className="flex justify-end px-3 gap-10">
                <span className="w-32">Change Returned</span>
                <span className="w-24 text-right font-bold text-emerald-700">{formatPKR(cashReturned)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-end px-3 gap-10">
            <span className="w-32">{paymentMethod} Paid</span>
            <span className="w-24 text-right font-bold">{formatPKR(amountPaid)}</span>
          </div>
        )}

        {/* Partial Payment Warning & Outstanding Due Notice */}
        {isPartial ? (
          <div className="mt-3 p-2.5 bg-amber-50 border-2 border-dashed border-amber-600 rounded-lg text-amber-900 space-y-1">
            <div className="flex justify-between font-bold text-xs">
              <span>Amount Paid Now:</span>
              <span className="font-mono">{formatPKR(amountPaid)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-amber-800 border-t border-amber-300 pt-1">
              <span>REMAINING BALANCE DUE:</span>
              <span className="font-mono">{formatPKR(remainingDue)}</span>
            </div>
            <p className="text-[10px] text-amber-700 italic pt-0.5">
              * Please settle outstanding balance on or before next clinical appointment.
            </p>
          </div>
        ) : (
          <div className="text-right px-3 pt-1 text-xs font-black text-emerald-700 uppercase">
            ✓ Status: Paid in Full
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-slate-400 mt-4" />

      {/* Terms & Return Policy */}
      <div className="pt-4 text-center space-y-2">
        <p className="font-black uppercase tracking-wide flex items-center justify-center gap-2">
          <span className="border-t border-dashed border-slate-400 w-10 inline-block" />
          Our Policies
          <span className="border-t border-dashed border-slate-400 w-10 inline-block" />
        </p>
        <ul className="text-[10px] leading-relaxed list-disc list-inside text-left max-w-[420px] mx-auto space-y-1 font-semibold text-slate-800">
          <li>All appointments must be booked in advance with 50% payment to confirm your slot.</li>
          <li>Advance payment is non-refundable in case of no-show or cancellation.</li>
          <li>No refunds on completed services, treatments, or packages.</li>
          <li>Unused sessions are non-refundable but can be transferred to a friend/family member (with approval).</li>
          <li className="list-none pt-1 border-t border-dashed border-slate-200 mt-1 text-[9px] text-slate-500 font-bold leading-snug">
            We maintain high standards, but no refunds for skin reactions or any allergies. Inform us on time. Patch tests available on request.
          </li>
        </ul>
      </div>

      <div className="border-t border-dashed border-slate-400 mt-4" />

      {/* Thank you */}
      <div className="pt-4 text-center space-y-0.5">
        <p className="font-black">Thank you for choosing</p>
        <p className="font-black">{clinicInfo?.name || 'DBS Aesthetic Clinic & Salon'}</p>
      </div>
    </div>
  );
}

function DailyZReportContent({ data, clinicInfo, displayTime }: { data: any; clinicInfo: any; displayTime: string }) {
  const variance = Number(data.variance) || 0;
  const varianceStatus = data.varianceStatus || (variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short');

  return (
    <div className="space-y-0 text-[13px] text-slate-900 font-mono">
      {/* Title */}
      <div className="text-center py-2 border-b-2 border-slate-950 space-y-0.5">
        <h2 className="font-black text-sm tracking-wider uppercase">DAILY CASH DRAWER Z-REPORT</h2>
        <p className="text-[10px] text-slate-600 uppercase font-semibold">End-of-Shift Reconciliation</p>
      </div>

      {/* Date / Time */}
      <div className="flex justify-between font-bold py-2.5 text-xs">
        <span>Date: <span className="font-normal">{data.date}</span></span>
        <span>Time: <span className="font-normal">{data.time || displayTime}</span></span>
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Cash Reconciliation Figures */}
      <div className="py-3 space-y-2 text-xs">
        {data.openingFloat !== undefined && (
          <div className="flex justify-between items-center text-slate-600">
            <span>Morning Opening Float:</span>
            <span className="font-mono font-bold">{formatPKR(data.openingFloat)}</span>
          </div>
        )}
        {data.shiftNetInflow !== undefined && (
          <div className="flex justify-between items-center text-slate-600">
            <span>Shift Net Cash Inflow:</span>
            <span className="font-mono font-bold">{formatPKR(data.shiftNetInflow)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">Total System Expected:</span>
          <span className="font-mono font-bold">{formatPKR(data.systemExpectedCash ?? 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700">Physical Counted Cash:</span>
          <span className="font-mono font-bold">{formatPKR(data.actualCountedCash ?? 0)}</span>
        </div>

        <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm">
          <span className="font-black uppercase">Drawer Variance:</span>
          <span className={`font-mono font-black ${
            variance === 0 ? 'text-emerald-700' : variance > 0 ? 'text-blue-700' : 'text-rose-700'
          }`}>
            {variance >= 0 ? '+' : ''}{formatPKR(variance)} ({varianceStatus})
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Cashier Notes */}
      <div className="py-3 text-xs space-y-1">
        <p className="font-bold uppercase text-[10px] text-slate-600">Verification Notes:</p>
        <p className="text-slate-800 italic bg-slate-50 p-2 rounded border border-slate-200">
          {data.notes || 'Shift cash counted and verified by cashier.'}
        </p>
      </div>

      <div className="border-t border-dashed border-slate-400" />

      {/* Signature Lines */}
      <div className="pt-6 pb-2 grid grid-cols-2 gap-4 text-center text-[10px]">
        <div>
          <div className="border-b border-slate-400 mb-1" />
          <p className="font-bold uppercase">Cashier Signature</p>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-1" />
          <p className="font-bold uppercase">Manager Approval</p>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-400 mt-4" />
      <div className="pt-3 text-center space-y-0.5 text-[11px]">
        <p className="font-black">{clinicInfo?.name || 'DBS Aesthetic Clinic & Salon'}</p>
        <p className="text-[10px] text-slate-500">Audit-Certified Shift Closeout</p>
      </div>
    </div>
  );
}

function PrintDocument({ type, data, printTime }: { type: string; data: any; printTime?: string }) {
  const { clinicInfo, branches } = useClinic();

  const branch = branches.find((b: any) => b.id === data.branchId);
  const displayClinicName = branch ? `${clinicInfo.name} (${branch.name})` : clinicInfo.name;
  const displayAddress = branch ? branch.location : clinicInfo.address;
  const displayPhone = branch ? branch.phone || clinicInfo.phone : clinicInfo.phone;
  const displayTime = printTime || getLocalTimeString();

  // Single source of truth for the invoice/reference number —
  // used for the printed label, the QR code payload, and the barcode.
  const referenceNumber: string =
    data.invoiceId || data.id || `INV-${Date.now()}`;

  return (
    <div className="bg-white text-slate-900 p-6 font-sans max-w-[380px] mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pb-4">
        <div className="flex justify-center">
          <img src="/logo.png" alt="DBS Logo" className="h-24 w-auto object-contain" />
        </div>
        <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
          {displayClinicName}
        </h1>
        <p className="text-[11px] text-slate-600 leading-snug max-w-[300px] mx-auto">
          {displayAddress}
        </p>
        <p className="text-[11px] text-slate-800 font-bold">
          Tel: {displayPhone}
        </p>

      </div>

      <div className="border-t border-dashed border-slate-400" />

      {type === 'invoice' && <InvoicePrintContent data={data} clinicInfo={clinicInfo} printTime={displayTime} />}

      {(type === 'z-report' || (type === 'slip' && (data.systemExpectedCash !== undefined || data.title?.includes('Z-REPORT') || data.variance !== undefined))) && (
        <DailyZReportContent data={data} clinicInfo={clinicInfo} displayTime={displayTime} />
      )}

      {type === 'slip' && !(data.systemExpectedCash !== undefined || data.title?.includes('Z-REPORT') || data.variance !== undefined) && (
        <div className="pt-4 space-y-4 text-[13px] font-mono">
          <div className="flex justify-between font-bold pb-2">
            <span>Date: <span className="font-normal">{data.date ? formatDateDisplay(data.date) : formatDateDisplay(getLocalDateString())}</span></span>
            <span>Time: <span className="font-normal">{displayTime}</span></span>
          </div>
          <div className="border-t border-dashed border-slate-400" />
          <div className="space-y-1 font-semibold text-slate-800">
            <p className="font-black uppercase tracking-wide text-slate-900">Appointment Details</p>
            <p>Client Name : <span className="font-bold">{data.clientName}</span></p>
            <p>Scheduled Service : <span className="font-bold">{data.serviceName}</span></p>
            {data.category && <p>Category : <span className="font-bold capitalize">{data.category}</span></p>}
            <p>Assigned Specialist : <span className="font-bold">{data.staffName || 'Assigned Specialist'}</span></p>
            <p>Treatment Date : <span className="font-bold">{data.date}</span></p>
            <p>Treatment Time : <span className="font-bold">{data.time}</span></p>
          </div>
          <div className="border-t border-dashed border-slate-400 pt-2">
            <p className="font-black text-slate-900">Booking Fee: {formatPKR(data.price ?? 0)}</p>
          </div>

          <div className="border-t border-dashed border-slate-400 pt-3 text-[10px] leading-relaxed text-slate-750 font-bold">
            <p className="font-black uppercase tracking-wide text-slate-900 mb-1">Our Policies</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All appointments must be booked in advance with 50% payment to confirm your slot.</li>
              <li>Advance payment is non-refundable in case of no-show or cancellation.</li>
              <li>No refunds on completed services, treatments, or packages.</li>
              <li>Unused sessions are non-refundable but can be transferred to a friend/family member (with approval).</li>
            </ul>
            <p className="mt-1 pt-1 border-t border-dashed border-slate-200 text-[9px] text-slate-500">
              We maintain high standards, but no refunds for skin reactions or any allergies. Inform us on time. Patch tests available on request.
            </p>
          </div>

          <div className="border-t border-dashed border-slate-400 mt-4" />
          <div className="pt-4 text-center space-y-0.5">
            <p className="font-black text-slate-900">Thank you for choosing DBS Aesthetic Clinic & Salon</p>
          </div>
        </div>
      )}

      {type === 'client' && (
        <div className="pt-4 space-y-1 text-[13px] font-mono">
          <p>Name : <span className="font-bold">{data.name}</span></p>
          <p>Phone : <span className="font-bold">{data.phone}</span></p>
          <p>Total Spent : <span className="font-bold">{formatPKR(data.totalSpent ?? 0, { decimals: false })}</span></p>
          <p>Visits Count : <span className="font-bold">{data.visitsCount} visits</span></p>
          <p>Joined Date : <span className="font-bold">{data.joinedDate}</span></p>
          {data.notes && (
            <div className="border-t border-dashed border-slate-400 pt-2 mt-2">
              <strong>Clinical Notes:</strong> {data.notes}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-dashed border-slate-400 mt-4" />

      {/* Footer: FBR POS + QR + barcode, both generated from the invoice number */}
      <div className="pt-4 flex items-center justify-center gap-6">
        <div className="w-16 h-16 flex items-center justify-center">
          <QRCodeSVG
            value={referenceNumber}
            size={64}
            level="M"
            marginSize={0}
          />
        </div>

        <div className="flex flex-col items-center">
          <Barcode
            value={referenceNumber}
            format="CODE128"
            width={1.1}
            height={32}
            displayValue={false}
            margin={0}
            background="transparent"
          />
        </div>
      </div>

      <p className="text-[10px] text-center tracking-widest pt-5">
        {referenceNumber}
      </p>

      <p className="text-center text-[10px] text-slate-500 pt-3 leading-relaxed">
        This is computer generated invoice.<br />
        No signature required.
      </p>

      <div className="border-t border-dashed border-slate-400 mt-4" />

      <div className="pt-3 text-center space-y-0.5 text-[11px]">
        <p>Developed by</p>
        <p className="font-black">CodeX Studio</p>
      </div>
    </div>
  );
}

export const PrintModal: React.FC = () => {
  const { printData, setPrintData } = useClinic();
  const [mounted, setMounted] = React.useState(false);
  const [currentClockTime, setCurrentClockTime] = React.useState<string>(() => getLocalTimeString());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (printData) {
      setCurrentClockTime(getLocalTimeString());
    }

    const handleBeforePrint = () => {
      setCurrentClockTime(getLocalTimeString());
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [printData]);

  if (!printData) return null;

  const handlePrint = () => {
    setCurrentClockTime(getLocalTimeString());
    window.print();
  };

  const { title, type, data } = printData;

  return (
    <>
      <Modal
        isOpen={!!printData}
        onClose={() => setPrintData(null)}
        title={`Print Document - ${title}`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <div className="flex justify-end gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 no-print">
            <Button onClick={handlePrint} variant="primary" icon={<Printer className="w-4 h-4" />}>
              Print Document Now
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <PrintDocument type={type} data={data} printTime={currentClockTime} />
          </div>
        </div>
      </Modal>

      {mounted &&
        createPortal(
          <div id="print-portal" aria-hidden="true">
            <PrintDocument type={type} data={data} printTime={currentClockTime} />
          </div>,
          document.body
        )}
    </>
  );
};
