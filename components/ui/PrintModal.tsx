'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from './Button';
import { Modal } from './Modal';

function InvoicePrintContent({ data }: { data: any }) {
  const items = data.items?.length
    ? data.items
    : [{ name: data.serviceName, price: data.amount, quantity: 1 }];

  return (
    <div className="space-y-6">
      {/* Billed To / Specialist Info Grid */}
      <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
        <div className="space-y-1.5">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Billed To</span>
          <span className="font-extrabold text-slate-900 text-sm block">{data.clientName || 'Valued Client'}</span>
          {data.phone && <p className="text-slate-600">Phone: {data.phone}</p>}
          <p className="text-slate-500 font-medium">
            Payment Method: <span className="text-slate-950 font-bold">{data.paymentMethod || 'Card'}</span>
            {data.paymentMethod === 'Card' && data.cardLastFour && (
              <span className="text-slate-500 block text-[10px] mt-1 font-semibold">
                • {data.cardType || 'Card'} ending in {data.cardLastFour}
                {data.bankTxnId && ` (Txn ID: ${data.bankTxnId})`}
              </span>
            )}
          </p>
        </div>
        <div className="text-right space-y-1.5 border-l border-slate-200/60 pl-6">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Invoice Details</span>
          <span className="font-mono font-black text-slate-900 block text-sm">
            {data.invoiceId || data.id || `DOC-${Date.now().toString().slice(-6)}`}
          </span>
          <p className="text-slate-600">
            Date: {data.date || new Date().toLocaleDateString('en-PK')}
          </p>
          <p className="text-slate-500 font-medium">
            Specialist: <span className="text-slate-950 font-bold">{data.staffName || data.assignedStaffName || 'Dr. Ali Imran (Consultant)'}</span>
          </p>
        </div>
      </div>

      {/* Styled Invoice Items Table */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 text-white font-semibold uppercase tracking-wider text-[9px]">
              <th className="p-4">Item / Service</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Qty</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium bg-white">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-900">{item.name}</td>
                <td className="p-4 text-right font-mono">{formatPKR(item.price)}</td>
                <td className="p-4 text-center text-slate-500 font-mono">{item.quantity}</td>
                <td className="p-4 text-right font-bold text-slate-900 font-mono">
                  {formatPKR(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="flex justify-end text-xs pt-2">
        <div className="w-72 space-y-2.5 border-t-2 border-slate-150 pt-4 font-medium">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-mono text-slate-900">{formatPKR(data.subtotal ?? data.amount)}</span>
          </div>
          {data.discountPercent > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount ({data.discountPercent}%):</span>
              <span className="font-mono">-{formatPKR(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Tax ({data.taxPercent ?? 10}%):</span>
            <span className="font-mono text-slate-900">{formatPKR(data.tax ?? 0)}</span>
          </div>
          <div className="flex justify-between font-black text-lg text-slate-900 border-t border-slate-300 pt-3">
            <span>Grand Total:</span>
            <span className="font-mono text-blue-600">{formatPKR(data.grandTotal ?? data.amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintDocument({ type, data }: { type: string; data: any }) {
  const { clinicInfo } = useClinic();

  return (
    <div className="bg-white text-slate-900 p-8 font-sans max-w-[210mm] mx-auto space-y-6">
      {/* Header Accent Line */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full" />
      
      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img 
              src="/logo.png" 
              alt="DBS Logo" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase leading-none">
                {clinicInfo.name}
              </h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">Aesthetics & Wellness Spa</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-[340px] leading-relaxed">{clinicInfo.address}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Phone: {clinicInfo.phone} • Email: {clinicInfo.email}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="inline-block px-3 py-1 bg-slate-950 text-white text-[9px] font-black tracking-wider uppercase rounded-lg mb-2 shadow-sm">
            {type === 'invoice' ? 'OFFICIAL INVOICE' : type === 'slip' ? 'BOOKING CONFIRMATION' : 'CLIENT RECORD'}
          </span>
          <p className="text-xs font-mono font-bold text-slate-700">
            ID: {data.invoiceId || data.id || `DOC-${Date.now().toString().slice(-6)}`}
          </p>
          <p className="text-xs text-slate-500 font-medium">Date: {data.date || new Date().toLocaleDateString('en-PK')}</p>
        </div>
      </div>

      {type === 'invoice' && <InvoicePrintContent data={data} />}

      {type === 'slip' && (
        <div className="space-y-4 text-xs">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="font-black text-slate-950 text-sm uppercase tracking-wider">Appointment Details</h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-slate-700 font-medium border-t border-slate-200/60 pt-3">
              <p><strong>Client Name:</strong> <span className="text-slate-950 font-bold">{data.clientName}</span></p>
              <p><strong>Contact Phone:</strong> {data.phone || 'N/A'}</p>
              <p><strong>Scheduled Service:</strong> <span className="text-slate-950 font-bold">{data.serviceName}</span></p>
              <p><strong>Assigned Specialist:</strong> <span className="text-slate-950 font-bold">{data.staffName || 'Dr. Ali Imran (Consultant)'}</span></p>
              <p><strong>Treatment Date:</strong> {data.date}</p>
              <p><strong>Treatment Time:</strong> {data.time}</p>
              <p className="col-span-2 text-sm border-t border-slate-200/60 pt-3 mt-1">
                <strong>Booking Fee:</strong> <span className="text-blue-600 font-black font-mono">{formatPKR(data.price ?? 0)}</span>
              </p>
            </div>
          </div>
          <div className="p-4 bg-yellow-500/5 rounded-2xl text-yellow-800 border border-yellow-500/10 leading-relaxed font-medium">
            <strong>Pre-Treatment Instructions:</strong> Please arrive 15 minutes prior to your booking. Avoid direct sun exposure 48 hours before laser or facial treatment.
          </div>
        </div>
      )}

      {type === 'client' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 font-medium text-slate-700">
            <p><strong>Name:</strong> <span className="text-slate-900 font-bold">{data.name}</span></p>
            <p><strong>Phone:</strong> {data.phone}</p>
            <p><strong>Total Spent:</strong> <span className="text-emerald-600 font-bold font-mono">{formatPKR(data.totalSpent ?? 0, { decimals: false })}</span></p>
            <p><strong>Visits Count:</strong> {data.visitsCount} visits</p>
            <p><strong>Joined Date:</strong> {data.joinedDate}</p>
          </div>
          {data.notes && (
            <p className="text-slate-600 p-4 bg-slate-50 rounded-2xl border border-slate-100 leading-relaxed">
              <strong>Clinical Notes:</strong> {data.notes}
            </p>
          )}
        </div>
      )}

      {/* Signature & Stamp Blocks */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200/60 text-xs">
        <div className="space-y-8">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Client Acknowledgement</p>
          <div className="border-b border-slate-350 w-48 pt-2" />
          <p className="text-slate-500 text-[10px] font-medium">Signature of Client</p>
        </div>
        <div className="space-y-8 flex flex-col items-end">
          <div className="w-48 text-right space-y-8">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] text-left">Authorized Representative</p>
            <div className="border-b border-slate-350 w-48 pt-2" />
            <p className="text-slate-500 text-[10px] font-medium text-left">Clinic Stamp & Signature</p>
          </div>
        </div>
      </div>

      {/* Terms & Return Policy */}
      <div className="pt-4 mt-4 text-center text-[10px] text-slate-400 space-y-1.5 border-t border-dashed border-slate-200/80">
        <p className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Terms & Return Policy</p>
        <p className="max-w-[520px] mx-auto leading-relaxed">
          All service packages, treatments, and procedures are strictly non-refundable and non-transferable. Appointments must be cancelled or rescheduled at least 24 hours in advance. Thank you for choosing {clinicInfo.name}.
        </p>
      </div>
    </div>
  );
}

export const PrintModal: React.FC = () => {
  const { printData, setPrintData } = useClinic();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!printData) return null;

  const handlePrint = () => {
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
            <PrintDocument type={type} data={data} />
          </div>
        </div>
      </Modal>

      {mounted &&
        createPortal(
          <div id="print-portal" aria-hidden="true">
            <PrintDocument type={type} data={data} />
          </div>,
          document.body
        )}
    </>
  );
};
