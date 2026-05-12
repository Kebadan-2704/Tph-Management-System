'use client'

import jsPDF from 'jspdf'
import { supabase } from '@/utils/supabase'
import type { Transaction, Family } from '@/utils/types'

/** Generate a receipt PDF for a transaction */
export const generateReceiptPDF = (tx: Transaction, family: Family | null, logoBase64: string): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  // Header background
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, w, 58, 'F')
  // Logo at top
  if (logoBase64) { try { doc.addImage(logoBase64, 'PNG', w / 2 - 8, 4, 16, 16) } catch(e) {} }
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('TRINITY PRAYER HOUSE', w / 2, 28, { align: 'center' })
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('Madukkarai, Coimbatore', w / 2, 35, { align: 'center' })
  doc.setFontSize(8); doc.setTextColor(148, 163, 184)
  doc.text('Official Contribution Receipt', w / 2, 42, { align: 'center' })
  // Watermark — logo in center with low opacity
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      // @ts-ignore - GState is available on jsPDF API
      const gs = new (jsPDF.API as any).GState({ opacity: 0.06 })
      doc.setGState(gs)
      doc.addImage(logoBase64, 'PNG', w / 2 - 28, h / 2 - 20, 56, 56)
      doc.restoreGraphicsState()
    } catch(e) {}
  }
  // Dashed line
  doc.setDrawColor(203, 213, 225); doc.setLineDashPattern([2, 2], 0); doc.line(15, 62, w - 15, 62)
  // Receipt details
  doc.setLineDashPattern([], 0); doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('RECEIPT NUMBER', 15, 72); doc.text('PAYMENT DATE', w / 2 + 5, 72)
  doc.setTextColor(30, 41, 59); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text(tx.receipt_number, 15, 79); doc.text(new Date(tx.payment_date).toLocaleDateString('en-IN'), w / 2 + 5, 79)
  doc.setTextColor(100, 116, 139); doc.setFontSize(8)
  doc.text('RECEIVED FROM', 15, 90)
  doc.setTextColor(30, 41, 59); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text(`${family?.head_name || ''} (${family?.membership_id || ''})`, 15, 97)
  let nextY = 108
  if (tx.remarks) {
    doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.text('REMARKS', 15, nextY)
    doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(tx.remarks, 15, nextY + 7)
    nextY += 20
  }
  // Amount box
  doc.setFillColor(15, 23, 42); doc.roundedRect(15, nextY, w - 30, 32, 4, 4, 'F')
  doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('AMOUNT RECEIVED', w / 2, nextY + 10, { align: 'center' })
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold')
  doc.text(`Rs. ${tx.amount.toLocaleString('en-IN')}`, w / 2, nextY + 24, { align: 'center' })
  // Footer
  doc.setTextColor(148, 163, 184); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your generous contribution.', w / 2, nextY + 46, { align: 'center' })
  doc.text('May God bless you abundantly!', w / 2, nextY + 52, { align: 'center' })
  return doc
}

/** Download a receipt as PDF */
export const downloadPDF = (tx: Transaction, family: Family | null, logoBase64: string) => {
  const doc = generateReceiptPDF(tx, family, logoBase64)
  doc.save(`Receipt_${tx.receipt_number}.pdf`)
}

/** Send a receipt via WhatsApp with PDF upload */
export const sendWhatsApp = async (tx: Transaction, family: Family | null, logoBase64: string) => {
  if (!family?.mobile) return alert('No mobile number registered.')
  let phone = family.mobile.replace(/\D/g, ''); if (phone.length === 10) phone = `91${phone}`
  const doc = generateReceiptPDF(tx, family, logoBase64)
  const pdfBlob = doc.output('blob')
  let pdfUrl = ''
  try {
    const filePath = `${tx.receipt_number}.pdf`
    await supabase.storage.from('receipts').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
    pdfUrl = data?.publicUrl || ''
  } catch (e) { console.error('Upload failed:', e) }
  const msg = `*Trinity Prayer House*\n\nDear ${family.head_name},\nWe have safely received your contribution of *₹${tx.amount.toLocaleString('en-IN')}* towards ${tx.purpose}.\n\nReceipt No: ${tx.receipt_number}\nDate: ${new Date(tx.payment_date).toLocaleDateString('en-IN')}${tx.remarks ? `\nRemarks: ${tx.remarks}` : ''}${pdfUrl ? `\n\n📄 *Download Receipt:*\n${pdfUrl}` : ''}\n\nMay God bless you abundantly!`
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
}

/** Print receipt in a new window */
export const printReceipt = (tx: Transaction, family: Family | null) => {
  const printWindow = window.open('', '_blank'); if (!printWindow) return;
  printWindow.document.write(`<html><head><title>Receipt ${tx.receipt_number}</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet"><style>body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; margin: 0; display: flex; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-container { width: 100%; max-width: 600px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 32px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); position: relative; overflow: hidden; } .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 30px; margin-bottom: 30px; } .logo { width: 90px; height: 90px; object-fit: contain; margin-bottom: 16px; } .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; } .subtitle { font-size: 15px; color: #64748b; font-weight: 600; margin-top: 6px; } .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; } .detail-box { background: #f8fafc; padding: 16px; border-radius: 16px; } .detail-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; } .detail-value { font-size: 16px; font-weight: 700; color: #334155; } .amount-container { text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 32px; border-radius: 24px; margin-bottom: 30px; } .amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; } .amount-value { font-size: 48px; font-weight: 800; margin: 0; color: #fff; letter-spacing: -1px; } .footer { text-align: center; font-size: 14px; color: #94a3b8; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 24px; } @media print { body { background: white; padding: 0; } .receipt-container { box-shadow: none; border: none; padding: 20px; max-width: 100%; } }</style></head><body><div class="receipt-container"><div class="header"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/loooBlack.png" class="logo" alt="Logo"/><h1 class="title">TRINITY PRAYER HOUSE</h1><p class="subtitle">Madukkarai, Coimbatore</p></div><div class="details"><div class="detail-box"><div class="detail-label">Receipt Number</div><div class="detail-value">${tx.receipt_number}</div></div><div class="detail-box"><div class="detail-label">Payment Date</div><div class="detail-value">${new Date(tx.payment_date).toLocaleDateString('en-IN')}</div></div><div class="detail-box" style="grid-column: span 2;"><div class="detail-label">Received From</div><div class="detail-value">${family?.head_name} (${family?.membership_id})</div></div><div class="detail-box" style="grid-column: span 2;"><div class="detail-label">Purpose of Contribution</div><div class="detail-value">${tx.purpose}</div></div></div><div class="amount-container"><div class="amount-label">Amount Received</div><div class="amount-value">₹${tx.amount.toLocaleString('en-IN')}</div></div><div class="footer">Thank you for your generous contribution.<br>May God bless you abundantly!</div></div><script>setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 500);</script></body></html>`);
  printWindow.document.close()
}

/** Generate Monthly Financial Report PDF */
export const generateMonthlyReportPDF = (transactions: Transaction[], monthStr: string) => {
  // Use dynamic import or require to avoid breaking if jsPDF-autotable is not fully loaded in server context
  import('jspdf-autotable').then((autoTableModule) => {
    const autoTable = autoTableModule.default;
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, w, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('TRINITY PRAYER HOUSE', w / 2, 18, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Monthly Financial Report - ${monthStr}`, w / 2, 26, { align: 'center' });
    
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`Total Collection: Rs. ${totalAmount.toLocaleString('en-IN')}`, 14, 52);

    const tableData = transactions.map(tx => [
      tx.receipt_number,
      new Date(tx.payment_date).toLocaleDateString('en-IN'),
      tx.purpose,
      `Rs. ${tx.amount.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Receipt No', 'Date', 'Purpose', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      foot: [['', '', 'TOTAL', `Rs. ${totalAmount.toLocaleString('en-IN')}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    doc.save(`TPH_Financial_Report_${monthStr}.pdf`);
  });
}
