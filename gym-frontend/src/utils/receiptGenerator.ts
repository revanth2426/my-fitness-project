// src/utils/receiptGenerator.ts
import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Define interfaces used by the generator
interface PaymentDataForPdf {
  paymentId: number;
  userName: string;
  userId: number;
  amount: number;
  dueAmount: number;
  totalMembershipFee: number;
  membershipSession: string | null;
  paymentDate: string;
  paymentMethod: string;
  paymentMethodDetail: string | null;
  membershipPlanId: number | null;
  membershipPlanName: string | null;
  transactionId?: string | null;
  notes?: string | null;
}

interface GymInfoForPdf {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// --- GLOBAL LAYOUT CONSTANTS (accessible to all helpers) ---
const largeTitleFontSize = 18;
const sectionHeaderFontSize = 10;
const bodyTextFontSize = 9;
const smallTextFontSize = 7;
const defaultLineHeight = 5; // Standard vertical advance for a single line of text
const sectionHeaderBgColor = [240, 240, 240]; // Light gray for section headers
const borderColor = [0, 0, 0]; // Black for main borders

// Export the generatePaymentReceiptPdf function
export const generatePaymentReceiptPdf = (paymentData: PaymentDataForPdf, gymInfo: GymInfoForPdf) => {
    // Using 'pt' (points) as unit and 'a5' format for the receipt
    const doc = new jsPDF("p", "mm", "a4"); // A4: 419.53 pt x 595.28 pt

    const pageWidth = doc.internal.pageSize.getWidth();  // A4 Width: 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // A4 Height: 297 mm

    // Define content area margins and starting positions (in points)
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight; // 170 mm
    let currentY = 20; // Starting Y position

    // Column X-positions for fixed two-column layouts within sections
    const labelColX = marginLeft + 5; // Label starts slightly after margin
    const valueColX = pageWidth - 5; // Value ends slightly before margin (right aligned)

    // --- Helper Functions (defined inside main function to close over currentY, doc, etc.) ---

    // Function to add text with specified font, size, color, and alignment
    interface AddTextOptions {
        fontSize?: number;
        fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
        align?: 'left' | 'center' | 'right';
        textColor?: number[];
        advanceY?: boolean;
    }

    const addText = (text: string, x: number, y: number, options: AddTextOptions = {}) => {
        doc.setFontSize(options.fontSize || bodyTextFontSize);
        doc.setFont('helvetica', options.fontStyle || 'normal');
        doc.setTextColor(options.textColor ? options.textColor[0] : 0, options.textColor ? options.textColor[1] : 0, options.textColor ? options.textColor[2] : 0);

        const textOptions: { align?: 'left' | 'center' | 'right' } = {};
        if (options.align) {
            textOptions.align = options.align;
        }

        doc.text(text, x, y, textOptions);

        if (options.advanceY !== false) {
            currentY += defaultLineHeight;
        }
    };

    // Helper to draw a horizontal line
    const drawLine = (y: number, color: number[] = [0, 0, 0], width: number = 0.2) => {
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(width);
        doc.line(marginLeft, y, pageWidth - marginRight, y);
    };

    // Helper to draw a rectangular box
    const drawBox = (yStart: number, height: number, fillColor: number[] | null = null, currentBorderColor: number[] = borderColor, borderWidth: number = 0.2) => {
        doc.setDrawColor(currentBorderColor[0], currentBorderColor[1], currentBorderColor[2]);
        doc.setLineWidth(borderWidth);
        if (fillColor) {
            doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
            doc.rect(marginLeft, yStart, contentWidth, height, 'FD'); // Fill and Draw
        } else {
            doc.rect(marginLeft, yStart, contentWidth, height); // Draw only
        }
    };

    // Helper to draw a label-value pair within a section with specific x-coordinates for alignment
    interface DrawSectionLabelValueOptions { // Corrected interface
        isValueRed?: boolean;
        labelFontSize?: number;
        valueFontSize?: number;
        labelStyle?: 'normal' | 'bold';
        valueStyle?: 'normal' | 'bold';
        textColor?: number[]; // ADDED: textColor property
    }

    const drawSectionLabelValue = (label: string, value: string, labelX: number, valueX: number, options: DrawSectionLabelValueOptions = {}) => {
        doc.setFontSize(options.labelFontSize || bodyTextFontSize);
        doc.setFont('helvetica', options.labelStyle || 'normal');
        doc.setTextColor(0, 0, 0); // Always black for label
        doc.text(label, labelX, currentY);

        doc.setFontSize(options.valueFontSize || bodyTextFontSize);
        doc.setFont('helvetica', options.valueStyle || 'normal');
        doc.setTextColor(options.textColor ? options.textColor[0] : (options.isValueRed ? 255 : 0), options.textColor ? options.textColor[1] : (options.isValueRed ? 0 : 0), options.textColor ? options.textColor[2] : (options.isValueRed ? 0 : 0));
        doc.text(value, valueX, currentY, { align: 'right' });
        doc.setTextColor(0); // Reset for next text
        currentY += defaultLineHeight;
    };

    // Helper to draw a section header box
    const drawSectionHeaderBox = (title: string, sectionStartY: number, currentSectionHeaderBgColor: number[] = sectionHeaderBgColor) => {
        doc.setFillColor(currentSectionHeaderBgColor[0], currentSectionHeaderBgColor[1], currentSectionHeaderBgColor[2]);
        doc.rect(marginLeft, sectionStartY, contentWidth, sectionHeaderFontSize + 3, 'F'); // Box for header
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.1);
        doc.rect(marginLeft, sectionStartY, contentWidth, sectionHeaderFontSize + 3); // Border for header
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sectionHeaderFontSize); // Corrected to use sectionHeaderFontSize
        doc.setTextColor(0, 0, 0);
        doc.text(title, pageWidth / 2, sectionStartY + 1 + (sectionHeaderFontSize / 2), { align: 'center', baseline: 'middle' });
        doc.setLineWidth(0.2); // Reset line width for content sections
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]); // Reset draw color to black
        currentY = sectionStartY + sectionHeaderFontSize + 3 + 2; // Set currentY after header box + some space
    };


    // --- Document Header (Gym Info) ---
    addText(gymInfo.name, pageWidth / 2, currentY, { fontSize: largeTitleFontSize, fontStyle: 'bold', align: 'center' });
    addText(gymInfo.address, pageWidth / 2, currentY, { fontSize: bodyTextFontSize, align: 'center' });
    addText(`Phone: ${gymInfo.phone} | Email: ${gymInfo.email}`, pageWidth / 2, currentY, { fontSize: bodyTextFontSize, align: 'center' });
    currentY += 10; // Space after gym info

    drawLine(currentY, [150, 150, 150]); // Thin separator line
    currentY += 5; // Space after line

    addText("OFFICIAL PAYMENT RECEIPT", pageWidth / 2, currentY, { fontSize: largeTitleFontSize - 2, fontStyle: 'bold', align: 'center' });
    currentY += 8;

    // --- Section: Receipt Details ---
    const receiptDetailsBoxStartY = currentY;
    const receiptDetailsBoxHeight = 35; // Fixed height for consistency
    drawBox(receiptDetailsBoxStartY, receiptDetailsBoxHeight); // Draw box around this section

    currentY += 2; // Padding inside box
    addText("RECEIPT DETAILS", marginLeft + 5, currentY, { fontSize: sectionHeaderFontSize, fontStyle: 'bold', advanceY: false });
    addText("DATE: " + format(new Date(paymentData.paymentDate), 'dd-MMM-yyyy'), pageWidth - 5, currentY, { align: 'right', fontSize: sectionHeaderFontSize, fontStyle: 'bold' });
    currentY += defaultLineHeight + 2; // Advance after header line and add padding

    drawLine(currentY, [220, 220, 220], 0.1); // Light separator line for details
    currentY += 2;

    const receiptLabelX = marginLeft + 5;
    const receiptValueX = pageWidth - 5;

    drawSectionLabelValue("RECEIPT ID:", paymentData.paymentId.toString(), receiptLabelX, receiptValueX);
    drawSectionLabelValue("MEMBER NAME:", paymentData.userName, receiptLabelX, receiptValueX);
    drawSectionLabelValue("MEMBER ID:", paymentData.userId.toString(), receiptLabelX, receiptValueX);
    // drawSectionLabelValue("CONTACT NO.:", paymentData.contactNumber || 'N/A', receiptLabelX, receiptValueX); // If contact is available in data

    currentY = receiptDetailsBoxStartY + receiptDetailsBoxHeight + 5; // Set Y after the box plus spacing


    // --- Section: Charges & Payment Breakdown ---
    const chargesBoxStartY = currentY;
    const chargesBoxHeight = 70; // Adjusted fixed height for charges section
    drawBox(chargesBoxStartY, chargesBoxHeight);

    currentY += 2; // Padding inside box
    addText("CHARGES & PAYMENT BREAKDOWN", marginLeft + 5, currentY, { fontSize: sectionHeaderFontSize, fontStyle: 'bold', advanceY: false });
    currentY += defaultLineHeight + 2; // Advance after header line and add padding

    drawLine(currentY, [220, 220, 220], 0.1); // Light separator line
    currentY += 2;

    const chargesLabelX = marginLeft + 5;
    const chargesValueX = pageWidth - 5;

    drawSectionLabelValue("MEMBERSHIP PLAN:", `${paymentData.membershipPlanName || 'N/A'}`, chargesLabelX, chargesValueX);
    drawSectionLabelValue("SESSION PERIOD:", `${paymentData.membershipSession || 'N/A'}`, chargesLabelX, chargesValueX);
    currentY += defaultLineHeight; // Space before financial lines

    // Financial lines with INR currency
    drawSectionLabelValue("TOTAL FEE:", `INR ${paymentData.totalMembershipFee.toFixed(2)}`, chargesLabelX, chargesValueX, {labelStyle: 'bold'});
    drawSectionLabelValue("AMOUNT PAID:", `INR ${paymentData.amount.toFixed(2)}`, chargesLabelX, chargesValueX, {labelStyle: 'bold'});
    
    if (paymentData.dueAmount > 0) {
        drawSectionLabelValue("OUTSTANDING DUE:", `INR ${paymentData.dueAmount.toFixed(2)}`, chargesLabelX, chargesValueX, { isValueRed: true, labelStyle: 'bold', valueStyle: 'bold' });
        drawSectionLabelValue("PAYMENT STATUS:", "DUE", chargesLabelX, chargesValueX, { isValueRed: true, labelStyle: 'bold', valueStyle: 'bold' });
    } else {
        drawSectionLabelValue("PAYMENT STATUS:", "PAID IN FULL", chargesLabelX, chargesValueX, { labelStyle: 'bold', valueStyle: 'bold', textColor: [0, 128, 0] }); // Green for paid in full
    }

    currentY = chargesBoxStartY + chargesBoxHeight + 5; // Set Y after the box plus spacing


    // --- Section: Transaction Details ---
    const transactionBoxStartY = currentY;
    let transactionBoxHeight = 40; // Initial height, adjust if notes added

    currentY += 2; // Padding inside box
    addText("TRANSACTION DETAILS", marginLeft + 5, currentY, { fontSize: sectionHeaderFontSize, fontStyle: 'bold', advanceY: false });
    currentY += defaultLineHeight + 2; // Advance after header line and add padding

    drawLine(currentY, [220, 220, 220], 0.1); // Light separator line
    currentY += 2;

    const transactionLabelX = marginLeft + 5;
    const transactionValueX = pageWidth - 5;

    drawSectionLabelValue("PAYMENT METHOD:", `${paymentData.paymentMethod} ${paymentData.paymentMethodDetail ? `(${paymentData.paymentMethodDetail})` : ''}`, transactionLabelX, transactionValueX);
    
    if (paymentData.transactionId) {
        drawSectionLabelValue("TRANSACTION ID:", paymentData.transactionId, transactionLabelX, transactionValueX);
    }
    
    // --- Notes (Optional, within Transaction Details Box) ---
    if (paymentData.notes && paymentData.notes.length > 0) {
        currentY += defaultLineHeight; // Add space before notes label
        addText("NOTES:", transactionLabelX, currentY, { fontStyle: 'bold', advanceY: false });
        currentY += defaultLineHeight * 0.8; // Small advance for notes content
        
        doc.setFontSize(bodyTextFontSize);
        doc.setFont('helvetica', 'normal');
        const notesContentX = transactionLabelX;
        const notesLineHeight = defaultLineHeight * 0.9; // Slightly smaller line height for notes to fit more
        const maxNotesWidth = contentWidth - 10; // Max width for notes text
        const splitNotes = doc.splitTextToSize(paymentData.notes, maxNotesWidth);
        splitNotes.forEach((line: string) => { // Explicitly type 'line' as string
            addText(line, notesContentX, currentY, { advanceY: false });
            currentY += notesLineHeight;
        });
        currentY += defaultLineHeight; // Space after notes content
    }
    
    // Adjust transactionBoxHeight based on actual content
    transactionBoxHeight = (currentY - transactionBoxStartY) + 2; // +2 for bottom padding

    drawBox(transactionBoxStartY, transactionBoxHeight); // Draw box around this section
    currentY = transactionBoxStartY + transactionBoxHeight + 15; // Set Y after the box plus spacing


    // --- Section: Prepared By / Verified By ---
    const signatureLineLength = (contentWidth / 2) - 15; // Half width minus gap between them
    const signatureLabelYOffset = 3; // Space below signature line
    const signatureLineYOffset = 10; // Space between label and line

    addText("PREPARED BY:", marginLeft, currentY, { fontSize: sectionHeaderFontSize, fontStyle: 'bold', advanceY: false });
    addText("VERIFIED BY:", marginLeft + contentWidth / 2 + 10, currentY, { fontSize: sectionHeaderFontSize, fontStyle: 'bold', advanceY: false });
    currentY += defaultLineHeight;

    // Draw signature lines
    doc.setDrawColor(0); // Black
    doc.setLineWidth(0.2); // Thin line
    doc.line(marginLeft, currentY + signatureLineYOffset, marginLeft + signatureLineLength, currentY + signatureLineYOffset); // Prepared By line
    doc.line(marginLeft + contentWidth / 2 + 10, currentY + signatureLineYOffset, marginLeft + contentWidth / 2 + 10 + signatureLineLength, currentY + signatureLineYOffset); // Verified By line
    
    currentY += signatureLineYOffset + signatureLabelYOffset; // Advance Y past lines and labels

    addText("(Signature)", marginLeft + signatureLineLength / 2, currentY, { align: 'center', fontSize: smallTextFontSize, advanceY: false });
    addText("(Signature)", marginLeft + contentWidth / 2 + 10 + signatureLineLength / 2, currentY, { align: 'center', fontSize: smallTextFontSize, advanceY: false });
    currentY += defaultLineHeight; // Advance Y after labels


    // --- Footer ---
    doc.setFontSize(smallTextFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100); // Gray text for footer
    addText("THANK YOU FOR YOUR PAYMENT!", pageWidth / 2, pageHeight - 15, { align: 'center', advanceY: false });
    addText("This is a computer generated receipt. No signature required.", pageWidth / 2, pageHeight - 10, { align: 'center', advanceY: false });
    
    doc.save(`Receipt_P${paymentData.paymentId}_${paymentData.userName}.pdf`);
};