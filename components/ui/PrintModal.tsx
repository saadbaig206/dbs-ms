'use client';

import React from 'react';
import { Printer, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useClinic } from '../../lib/context/ClinicContext';
import { Button } from './Button';
import { Modal } from './Modal';

export const PrintModal: React.FC = () => {
  const { printData, setPrintData } = useClinic();

  if (!printData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { title, type, data } = printData;

  return (
    <Modal
      isOpen={!!printData}
      onClose={() => setPrintData(null)}
      title={`Print Document - ${title}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        <div className="flex justify-end gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <Button onClick={handlePrint} variant="primary" icon={<Printer className="w-4 h-4" />}>
            Print Document Now
          </Button>
        </div>

        {/* Printable Paper Area */}
        <div 
          id="printable-area" 
          className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-sm font-sans"
        >
          {/* Clinic Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  AURA LUXURY CLINIC & MED SPA
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                450 Beverly Hills Crest • CA 90210 • Phone: +1 (555) 900-AURA
              </p>
              <p className="text-xs text-slate-500">
                Web: www.auraluxuryclinic.com • License: MED-SPA-884920
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded-md mb-1">
                {type === 'invoice' ? 'OFFICIAL INVOICE' : type === 'slip' ? 'BOOKING CONFIRMATION' : 'CLIENT RECORD'}
              </span>
              <p className="text-xs font-mono text-slate-500">
                {data.invoiceId || data.id || `DOC-${Date.now().toString().slice(-6)}`}
              </p>
              <p className="text-xs text-slate-500">
                Date: {data.date || new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Invoice / Slip Details */}
          {type === 'invoice' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Billed To</span>
                  <span className="font-bold text-slate-900 text-sm">{data.clientName || 'Valued VIP Client'}</span>
                  <p className="text-slate-600 mt-0.5">Payment Method: {data.paymentMethod || 'Card'}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-semibold block uppercase">Payment Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> PAID IN FULL
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 uppercase text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Service / Item</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-medium text-slate-800">{data.serviceName}</td>
                    <td className="py-3 px-3 text-right font-semibold">${data.amount?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Calculations */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs text-right border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${data.amount?.toFixed(2)}</span>
                  </div>
                  {data.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-${data.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (10%):</span>
                    <span>${data.tax?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-2">
                    <span>Grand Total:</span>
                    <span>${data.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'slip' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 text-sm mb-2 uppercase">Appointment Confirmation</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <p><strong>Client:</strong> {data.clientName}</p>
                  <p><strong>Phone:</strong> {data.phone}</p>
                  <p><strong>Service:</strong> {data.serviceName}</p>
                  <p><strong>Assigned Doctor/Staff:</strong> {data.staffName}</p>
                  <p><strong>Scheduled Date:</strong> {data.date}</p>
                  <p><strong>Scheduled Time:</strong> {data.time}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                <strong>Pre-Treatment Instructions:</strong> Please arrive 15 minutes before your scheduled appointment time. Avoid direct sun exposure 48 hours prior to laser and facial therapies.
              </div>
            </div>
          )}

          {/* Footer Terms */}
          <div className="border-t border-slate-200 pt-6 mt-8 text-center text-[10px] text-slate-400 space-y-1">
            <p>Thank you for choosing Aura Luxury Clinic & Medical Spa.</p>
            <p>This is an officially generated medical spa voucher & receipt.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
