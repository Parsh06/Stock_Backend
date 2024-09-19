const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');

const sendOrderConfirmation = async (form) => {
  try {
    // Create a PDF document in memory with adjusted margins
    const doc = new PDFDocument({
      margin: 30,
    });

    // Buffer for the PDF output
    const pdfBuffer = new streamBuffers.WritableStreamBuffer();

    // Pipe the PDF to the buffer
    doc.pipe(pdfBuffer);

    // Footer section
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

    // Title
    doc.fontSize(18).text('ORDER SHEET', { align: 'center' }).moveDown(1);

    // Client information
    doc.fontSize(12)
      .text(`Client Name: ${form.userName}`, { align: 'left' })
      .text(`UCC CODE: ${form.UCC_CODE}`, { align: 'left' })
      .moveDown()
      .text(`Date: ${form.currentDate}`, { align: 'left' })
      .text('Order Time: ', { align: 'left' })  // Leaving this field intentionally empty
      .moveDown(2);

    // Define table styling
    doc.fontSize(10).font('Helvetica-Bold');

    const tableTop = doc.y;

    // Draw table headers with proper lines and alignment
    doc.text('Sl No', 50, tableTop, { width: 50, align: 'center' })
      .text('Script/Contract Name', 100, tableTop, { width: 150, align: 'center' })
      .text('Qty', 250, tableTop, { width: 50, align: 'center' })
      .text('Rate', 300, tableTop, { width: 50, align: 'center' })
      .text('Buy/Sell', 350, tableTop, { width: 50, align: 'center' })
      .text('Stop Loss', 400, tableTop, { width: 50, align: 'center' })
      .text('Order Type', 450, tableTop, { width: 50, align: 'center' })
      .text('Remark', 500, tableTop, { width: 50, align: 'center' });

    // Add horizontal line after the header
    doc.moveTo(50, doc.y + 12).lineTo(550, doc.y + 12).stroke();

    // Table rows with cell borders
    doc.fontSize(12).font('Helvetica');

    const tableRowTop = doc.y + 20;

    // Add table row data
    doc.text('1', 50, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.stockName}`, 100, tableRowTop, { width: 150, align: 'center' })
      .text(`${form.quantity}`, 250, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.rate}`, 300, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.buyOrSell}`, 350, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.stopLoss || 'N/A'}`, 400, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.orderType || 'N/A'}`, 450, tableRowTop, { width: 50, align: 'center' })
      .text(`${form.remarks || 'N/A'}`, 500, tableRowTop, { width: 50, align: 'center' });

    // Draw vertical lines for table cells
    const tableBottom = doc.y + 20;
    doc.moveTo(50, tableTop).lineTo(50, tableBottom).stroke();  // Left border
    doc.moveTo(100, tableTop).lineTo(100, tableBottom).stroke();  // First column border
    doc.moveTo(250, tableTop).lineTo(250, tableBottom).stroke();  // Second column border
    doc.moveTo(300, tableTop).lineTo(300, tableBottom).stroke();  // Third column border
    doc.moveTo(350, tableTop).lineTo(350, tableBottom).stroke();  // Fourth column border
    doc.moveTo(400, tableTop).lineTo(400, tableBottom).stroke();  // Fifth column border
    doc.moveTo(450, tableTop).lineTo(450, tableBottom).stroke();  // Sixth column border
    doc.moveTo(500, tableTop).lineTo(500, tableBottom).stroke();  // Right border
    doc.moveTo(550, tableTop).lineTo(550, tableBottom).stroke();  // Seventh column border

    // Horizontal line after the row
    doc.moveTo(50, tableBottom).lineTo(550, tableBottom).stroke();

    // Draw a final horizontal line to end the table
    doc.moveTo(50, tableBottom + 20).lineTo(550, tableBottom + 20).stroke();

    // Move down to add space before the Remark section
    doc.moveDown(5);
    doc.fontSize(12)
      .moveDown()
      .text("Client's Full Signature:", { align: 'centre' })
      .text(form.userName, { align: 'centre' });

    doc.end();

    // Wait for the PDF to be completely generated
    const pdfData = await new Promise((resolve, reject) => {
      pdfBuffer.on('finish', () => resolve(pdfBuffer.getContents()));
      pdfBuffer.on('error', reject);
    });


    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // App password from Google
      },
    });

    // Send the email with the PDF attached as a buffer
    const info = await transporter.sendMail({
      from: '"Parsh Jain" <parshjain@example.com>', // Sender
      to: 'parshjain46@gmail.com, cpjain1980@gmail.com',  // Recipients
      subject: `Order Confirmation: ${form.stockName}`, // Email subject
      text: `Hello, Your order for ${form.stockName} has been placed successfully.`, // Text body
      html: createEmailTemplate(form), // Use email template
      attachments: [
        {
          filename: `Order_Confirmation_${form.stockName}.pdf`,
          content: pdfData, // Attach the PDF data as a buffer
          contentType: 'application/pdf'
        }
      ],
    });

    console.log('Order confirmation email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};

// Create the HTML email template
const createEmailTemplate = (form) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Sheet</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 0;
                margin: 0;
            }
            .container {
                width: 100%;
                max-width: 800px;
                margin: 20px auto;
                background-color: #fff;
                border: 1px solid #ddd;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
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
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="footer">
                <p><strong>MAYUR P. JAIN</strong></p>
                <p class="small-text">C/O. BHAIDAS MAGANLAL & CO.<br>SHARE & STOCK BROKER<br>5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER, BOMBAY SAMACHAR MARG, MUMBAI - 400 023</p>
                <p class="small-text">22-A, JAGJIVAN MANSION, GROUND FLOOR, SHOP NO-2, 2ND FANASWADI, MUMBAI - 400002</p>
            </div>
            
            <h2>ORDER SHEET</h2>
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
                    <td><strong>Order Type:</strong> ${form.orderType}</td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Remarks:</strong> ${form.remarks || 'None'}</td>
                </tr>
            </table>

            <p>The above details are confirmed by me.</p>
            <div class="signature">
                <p><strong>Client's Full Signature: ${form.userName}</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

module.exports = { sendOrderConfirmation };
