'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { CLINIC_INFO } from '../../lib/constants/clinic';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from './Button';
import { Modal } from './Modal';

function InvoicePrintContent({ data }: { data: any }) {
  const items = data.items?.length
    ? data.items
    : [{ name: data.serviceName, price: data.amount, quantity: 1 }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-500 font-semibold block uppercase">Billed To</span>
          <span className="font-bold text-slate-900 text-sm">{data.clientName || 'Valued Client'}</span>
          <p className="text-slate-600 mt-0.5">Payment Method: {data.paymentMethod || 'Card'}</p>
        </div>
        <div className="text-right">
          <span className="text-slate-500 font-semibold block uppercase">Payment Status</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> PAID IN FULL
          </span>
        </div>
      </div>

      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-100 uppercase text-slate-600 font-semibold">
          <tr>
            <th className="py-2.5 px-3 border border-slate-200">Service / Item</th>
            <th className="py-2.5 px-3 border border-slate-200 text-center">Qty</th>
            <th className="py-2.5 px-3 border border-slate-200 text-right">Unit Price</th>
            <th className="py-2.5 px-3 border border-slate-200 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: { name: string; price: number; quantity: number }, idx: number) => (
            <tr key={idx}>
              <td className="py-2.5 px-3 border border-slate-200 font-medium text-slate-800">{item.name}</td>
              <td className="py-2.5 px-3 border border-slate-200 text-center">{item.quantity}</td>
              <td className="py-2.5 px-3 border border-slate-200 text-right">{formatPKR(item.price)}</td>
              <td className="py-2.5 px-3 border border-slate-200 text-right font-semibold">
                {formatPKR(item.price * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-72 space-y-1.5 text-xs text-right border-t border-slate-200 pt-3">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{formatPKR(data.amount ?? 0)}</span>
          </div>
          {(data.discount ?? 0) > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discount:</span>
              <span>-{formatPKR(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Tax ({data.taxPercent ?? 10}%):</span>
            <span>{formatPKR(data.tax ?? 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-300 pt-2">
            <span>Grand Total:</span>
            <span>{formatPKR(data.grandTotal ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintDocument({ type, data }: { type: string; data: any }) {
  return (
    <div className="bg-white text-slate-900 p-8 font-sans max-w-[210mm] mx-auto">
      <div className="flex items-start justify-between border-b-2 border-slate-200 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase leading-tight">
                {CLINIC_INFO.name}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-600">{CLINIC_INFO.address}</p>
          <p className="text-xs text-slate-600">
            Phone: {CLINIC_INFO.phone} • Email: {CLINIC_INFO.email}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded-md mb-1">
            {type === 'invoice' ? 'OFFICIAL INVOICE' : type === 'slip' ? 'BOOKING CONFIRMATION' : 'CLIENT RECORD'}
          </span>
          <p className="text-xs font-mono text-slate-600">
            {data.invoiceId || data.id || `DOC-${Date.now().toString().slice(-6)}`}
          </p>
          <p className="text-xs text-slate-600">Date: {data.date || new Date().toLocaleDateString('en-PK')}</p>
        </div>
      </div>

      {type === 'invoice' && <InvoicePrintContent data={data} />}

      {type === 'slip' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-bold text-blue-900 text-sm mb-2 uppercase">Appointment Confirmation</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <p><strong>Client:</strong> {data.clientName}</p>
              <p><strong>Phone:</strong> {data.phone}</p>
              <p><strong>Service:</strong> {data.serviceName}</p>
              <p><strong>Assigned Staff:</strong> {data.staffName}</p>
              <p><strong>Date:</strong> {data.date}</p>
              <p><strong>Time:</strong> {data.time}</p>
              <p><strong>Fee:</strong> {formatPKR(data.price ?? 0)}</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200">
            <strong>Pre-Treatment Instructions:</strong> Please arrive 15 minutes before your appointment. Avoid direct sun exposure 48 hours prior to laser and facial therapies.
          </div>
        </div>
      )}

      {type === 'client' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p><strong>Name:</strong> {data.name}</p>
            <p><strong>Phone:</strong> {data.phone}</p>
            <p><strong>CNIC:</strong> {data.cnic}</p>
            <p><strong>Total Spent:</strong> {formatPKR(data.totalSpent ?? 0, { decimals: false })}</p>
            <p><strong>Visits:</strong> {data.visitsCount}</p>
            <p><strong>Joined:</strong> {data.joinedDate}</p>
          </div>
          {data.notes && (
            <p className="text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong>Notes:</strong> {data.notes}
            </p>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-6 mt-8 text-center text-[10px] text-slate-500 space-y-1">
        <p>Thank you for choosing {CLINIC_INFO.name}.</p>
        <p>This is an officially generated receipt & voucher.</p>
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
