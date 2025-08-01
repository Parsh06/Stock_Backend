require('dotenv').config();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');

const sendOrderConfirmation = async (form) => {
  try {
    // Create a PDF document in memory with 30px margin
    const doc = new PDFDocument({ margin: 30 });
    const pdfBuffer = new streamBuffers.WritableStreamBuffer();
    doc.pipe(pdfBuffer);

    // Company footer section
    doc.fontSize(10).text('MAYUR P. JAIN', { align: 'center' });
    doc.fontSize(9)
      .text('C/O. BHAIDAS MAGANLAL & CO.', { align: 'center' })
      .text('SHARE & STOCK BROKER', { align: 'center' })
      .text('5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER,', { align: 'center' })
      .text('BOMBAY SAMACHAR MARG, MUMBAI - 400 023', { align: 'center' })
      .moveDown()
      .text('22-A, JAGJIVAN MANSION, GROUND FLOOR, SHOP NO-2, 2ND FANASWADI,', { align: 'center' })
      .text('MUMBAI - 400002', { align: 'center' })
      .moveDown(2);

    // Title and client details
    doc.fontSize(18).text('ORDER SHEET', { align: 'center' }).moveDown(1);
    doc.fontSize(12)
      .text(`Client Name: ${form.userName}`, { align: 'left' })
      .text(`UCC CODE: ${form.UCC_CODE}`, { align: 'left' })
      .moveDown()
      .text(`Date: ${form.currentDate}`, { align: 'left' })
      .text(`Order Time: ${form.orderTime}`, { align: 'left' })
      .moveDown(2);

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('Sl No', 50, tableTop, { width: 50, align: 'center' })
      .text('Script/Contract Name', 100, tableTop, { width: 150, align: 'center' })
      .text('Qty', 250, tableTop, { width: 50, align: 'center' })
      .text('Rate', 300, tableTop, { width: 50, align: 'center' })
      .text('Buy/Sell', 350, tableTop, { width: 50, align: 'center' })
      .text('Stop Loss', 400, tableTop, { width: 50, align: 'center' })
      .text('Order Type', 450, tableTop, { width: 50, align: 'center' })
      .text('Remark', 500, tableTop, { width: 50, align: 'center' });
    doc.moveTo(50, doc.y + 12).lineTo(550, doc.y + 12).stroke();

    // Table row data
    doc.fontSize(12).font('Helvetica');
    const tableRowTop = doc.y + 20;
    doc.text('1', 50, tableRowTop, { width: 50, align: 'center' })
      .text(form.stockName, 100, tableRowTop, { width: 150, align: 'center' })
      .text(form.quantity, 250, tableRowTop, { width: 50, align: 'center' })
      .text(form.rate, 300, tableRowTop, { width: 50, align: 'center' })
      .text(form.buyOrSell, 350, tableRowTop, { width: 50, align: 'center' })
      .text(form.stopLoss || 'N/A', 400, tableRowTop, { width: 50, align: 'center' })
      .text(form.orderType || 'N/A', 450, tableRowTop, { width: 50, align: 'center' })
      .text(form.remarks || 'N/A', 500, tableRowTop, { width: 50, align: 'center' });
    const tableBottom = doc.y + 20;
    [50, 100, 250, 300, 350, 400, 450, 500, 550].forEach((x) => {
      doc.moveTo(x, tableTop).lineTo(x, tableBottom).stroke();
    });
    doc.moveTo(50, tableBottom).lineTo(550, tableBottom).stroke();
    doc.moveTo(50, tableBottom + 20).lineTo(550, tableBottom + 20).stroke();

    // Signature section
    doc.moveDown(5);
    doc.fontSize(12)
      .text("Client's Full Signature:", { align: 'center' })
      .text(form.userName, { align: 'center' });

    doc.end();

    // Wait for PDF generation to complete
    const pdfData = await new Promise((resolve, reject) => {
      pdfBuffer.on('finish', () => resolve(pdfBuffer.getContents()));
      pdfBuffer.on('error', reject);
    });

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with PDF attachment and HTML body
    const info = await transporter.sendMail({
      from: `"Parsh Jain" <${process.env.EMAIL_USER}>`,
      to: 'parshjain46@gmail.com, mayurinvestments2011@gmail.com',
      subject: `Order (${form.buyOrSell}): ${form.stockName}`,
      text: `Your order has been placed...`,
      html: createEmailTemplate(form),
      attachments: [
        {
          filename: `Order_${form.stockName}.pdf`,
          content: pdfData,
          contentType: 'application/pdf',
        }
      ]
    });
    console.log('Email sent: %s', info.messageId);
    return info; // Return info instead of sending response
  } catch (error) {
    console.error('Error generating PDF or sending email:', error);
    throw new Error('Error generating PDF or sending email.');
  }
};

const createEmailTemplate = (form) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 20px auto;
          background-color: #fff;
          border: 1px solid #ddd;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h2 {
          text-align: center;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
        .footer {
          text-align: center;
          font-size: 14px;
          margin-top: 20px;
        }
        .small-text {
          font-size: 12px;
        }
        .signature {
          margin-top: 30px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="footer">
          <p><strong>MAYUR P. JAIN</strong></p>
          <p class="small-text">
            C/O. BHAIDAS MAGANLAL & CO.<br>
            SHARE & STOCK BROKER<br>
            5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER,<br>
            BOMBAY SAMACHAR MARG, MUMBAI - 400 023
          </p>
          <p class="small-text">
            22-A, JAGJIVAN MANSION, GROUND FLOOR, SHOP NO-2, 2ND FANASWADI,<br>
            MUMBAI - 400002
          </p>
        </div>
        <h2>ORDER CONFIRMATION</h2>
        <table>
          <tr>
            <td><strong>Client Name:</strong> ${form.userName}</td>
            <td><strong>UCC CODE:</strong> ${form.UCC_CODE}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong> ${form.currentDate}</td>
            <td><strong>Order Time:</strong> ${form.orderTime}</td>
          </tr>
        </table>
        <table>
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Script/Contract Name</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Buy/Sell</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>${form.stockName}</td>
              <td>${form.quantity}</td>
              <td>${form.rate}</td>
              <td>${form.buyOrSell}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <tr>
            <td><strong>Stop Loss:</strong> ${form.stopLoss || 'N/A'}</td>
            <td><strong>Order Type:</strong> ${form.orderType || 'N/A'}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Remarks:</strong> ${form.remarks || 'None'}</td>
          </tr>
        </table>
        <p>Your order has been processed successfully.</p>
        <div class="signature">
          <p><strong>Client's Full Signature: ${form.userName}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { sendOrderConfirmation };
