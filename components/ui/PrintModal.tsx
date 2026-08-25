'use client';
 
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useClinic } from '../../lib/context/ClinicContext';
import { formatPKR } from '../../lib/utils/currency';
import { Button } from './Button';
import { Modal } from './Modal';
 
function InvoicePrintContent({ data, clinicInfo }: { data: any; clinicInfo: any }) {
  const items = data.items?.length
    ? data.items
    : [{ name: data.serviceName, price: data.amount, quantity: 1 }];
 
  const subtotal = data.subtotal ?? data.amount ?? 0;
  const tax = data.tax ?? 0;
  const discount = data.discount ?? 0;
  const netAmount = data.grandTotal ?? subtotal + tax - discount;
  const cashReceived = data.cashReceived ?? netAmount;
  const cashReturned = data.cashReturned ?? Math.max(cashReceived - netAmount, 0);
 
  // Calculate discount percentage if discount amount and subtotal are provided
  const discountPercent = data.discountPercent ?? (subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0);
 
  return (
    <div className="space-y-0 text-[13px] text-slate-900 font-mono">
      {/* Date / Time */}
      <div className="flex justify-between font-bold pb-3 pt-2">
        <span>Date: <span className="font-normal">{data.date || new Date().toLocaleDateString('en-GB')}</span></span>
        <span>Time: <span className="font-normal">{data.time || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span></span>
      </div>
 
      <div className="border-t border-dashed border-slate-400" />
 
      {/* Customer Info */}
      <div className="pt-3 pb-3 space-y-1">
        <p className="font-black font-bold uppercase tracking-wide">Customer Info</p>
        <p>Name : <span className="font-bold">{data.clientName || 'Valued Client'}</span></p>
        <p>Contact No : <span className="font-bold">{data.phone || 'N/A'}</span></p>
      </div>
 
      <div className="border-t border-dashed border-slate-400" />
 
      {/* Invoice Details */}
      <div className="pt-3 pb-3 space-y-1">
        <p className="font-black uppercase tracking-wide">Invoice Details</p>
        <p>Invoice Details: <span className="font-bold">{data.invoiceId || data.id || `INV-${Date.now().toString().slice(-6)}`}</span></p>
      </div>
 
      <div className="border-t border-dashed border-slate-400" />
 
      {/* Service Table */}
      <div className="pt-3">
        <div className="bg-slate-950 text-white flex justify-between px-3 py-2 rounded-md font-bold uppercase text-[11px] tracking-wide">
          <span className="w-1/3">Service</span>
          <span className="w-1/3 text-center">Quantity</span>
          <span className="w-1/3 text-right">Amount</span>
        </div>
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between px-3 py-2 text-slate-800">
            <span className="w-1/3">{item.name}</span>
            <span className="w-1/3 text-center">{item.quantity}</span>
            <span className="w-1/3 text-right">{formatPKR(item.price)}</span>
          </div>
        ))}
      </div>
 
      <div className="border-t border-dashed border-slate-400 mt-2" />
 
      {/* Totals */}
      <div className="pt-3 space-y-1.5 mr-[12px]">
        <div className="flex justify-end gap-10">
          <span className="font-bold w-32">Total</span>
          <span className="w-24 text-right">{formatPKR(subtotal)}</span>
        </div>
        <div className="flex justify-end gap-10">
          <span className="w-32">GST({data.taxPercent ?? 5}%)</span>
          <span className="w-24 text-right">{formatPKR(tax)}</span>
        </div>
        <div className="flex justify-end gap-10">
          <span className="w-32">Discount({discountPercent}%)</span>
          <span className="w-24 text-right">{formatPKR(discount)}</span>
        </div>
      </div>
 
      <div className="flex justify-end pt-2">
        <div className="w-70 border-t border-dashed border-slate-400" />
      </div>
 
      <div className="pt-3 space-y-1.5 mr-[12px]">
        <div className="flex justify-end gap-10">
          <span className="font-black w-32">Net Amount</span>
          <span className="w-24 text-right font-black">{formatPKR(netAmount)}</span>
        </div>
        <div className="flex justify-end gap-10">
          <span className="w-32">Cash received</span>
          <span className="w-24 text-right">{formatPKR(cashReceived)}</span>
        </div>
        <div className="flex justify-end gap-10">
          <span className="w-32">Cash returned</span>
          <span className="w-24 text-right">{formatPKR(cashReturned)}</span>
        </div>
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
        <p className="font-black">DBS Aesthetic Clinic & Salon</p>
      </div>
    </div>
  );
}
 
function PrintDocument({ type, data }: { type: string; data: any }) {
  const { clinicInfo, branches } = useClinic();
 
  const branch = branches.find((b: any) => b.id === data.branchId);
  const displayClinicName = branch ? `${clinicInfo.name} (${branch.name})` : clinicInfo.name;
  const displayAddress = branch ? branch.location : clinicInfo.address;
  const displayPhone = branch ? branch.phone || clinicInfo.phone : clinicInfo.phone;
 
  // Single source of truth for the invoice/reference number —
  // used for the printed label, the QR code payload, and the barcode.
  const referenceNumber: string =
    data.invoiceId || data.id || '135081-60821171915673';
 
  return (
    <div className="bg-white text-slate-900 p-6 font-sans max-w-[380px] mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pb-4">
        <div className="flex justify-center">
          <img src="/logo.png" alt="DBS Logo" className="h-22 w-auto object-contain" />
        </div>
        <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
          DBS Aesthetic Clinic & Salon
        </h1>
        <p className="text-[11px] text-slate-600 leading-snug max-w-[300px] mx-auto">
          {displayAddress}
        </p>
        <p className="text-[11px] text-slate-800 font-bold">
          UAN: 021-33485322
        </p>
 
      </div>
 
      <div className="border-t border-dashed border-slate-400" />
 
      {type === 'invoice' && <InvoicePrintContent data={data} clinicInfo={clinicInfo} />}
 
      {type === 'slip' && (
        <div className="pt-4 space-y-4 text-[13px] font-mono">
          <div className="space-y-1 font-semibold text-slate-800">
            <p className="font-black uppercase tracking-wide text-slate-900">Appointment Details</p>
            <p>Client Name : <span className="font-bold">{data.clientName}</span></p>
            <p>Contact Phone : <span className="font-bold">{data.phone || 'N/A'}</span></p>
            <p>Scheduled Service : <span className="font-bold">{data.serviceName}</span></p>
            {data.category && <p>Category : <span className="font-bold capitalize">{data.category}</span></p>}
            <p>Assigned Specialist : <span className="font-bold">{data.staffName || 'Dr. Ali Imran (Consultant)'}</span></p>
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
