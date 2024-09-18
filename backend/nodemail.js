require('dotenv').config();
const nodemailer = require('nodemailer');

const sendOrderConfirmation = async (form) => {
  try {
    // Create a transporter object using the default SMTP transport.
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // App password from Google
      },
    });

    // Email details with improved HTML structure and styling
    const info = await transporter.sendMail({
      from: '"Parsh Jain" <parshjain@example.com>', // Sender
      to: 'parshjain46@gmail.com, cpjain1980@gmail.com',  // Multiple recipients
      subject: `Order Confirmation: ${form.stockName}`, // Email subject
      text: `Hello, Your order for ${form.stockName} has been placed successfully.`, // Text body
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Sheet</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
              }
              .container {
                  width: 100%;
                  max-width: 800px;
                  margin: 0 auto;
                  border: 1px solid #000;
                  padding: 20px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
              }
              th, td {
                  border: 1px solid #000;
                  padding: 8px;
                  text-align: left;
                  word-wrap: break-word;
              }
              th {
                  background-color: #f2f2f2;
              }
              .signature {
                  margin-top: 30px;
              }
              .footer {
                  margin-top: 50px;
              }
              .small-text {
                  font-size: 10px;
              }
              .center-text {
                  text-align: center;
              }
              .print-btn {
                  margin-top: 20px;
                  display: flex;
                  justify-content: center;
              }
              .print-btn button {
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  border: none;
                  cursor: pointer;
              }
              .print-btn button:hover {
                  background-color: #45a049;
              }

              /* Responsive Design */
              @media (max-width: 768px) {
                  .container {
                      padding: 10px;
                  }
                  table, thead, tbody, th, td, tr {
                      display: block;
                  }
                  th, td {
                      width: 100%;
                      text-align: right;
                      position: relative;
                      padding-left: 50%;
                  }
                  th::before, td::before {
                      position: absolute;
                      left: 10px;
                      top: 8px;
                      width: 45%;
                      white-space: nowrap;
                      text-align: left;
                      font-weight: bold;
                  }
                  th:nth-child(1)::before { content: "Sl No"; }
                  th:nth-child(2)::before { content: "Script/Contract Name"; }
                  th:nth-child(3)::before { content: "Qty"; }
                  th:nth-child(4)::before { content: "Rate"; }
                  th:nth-child(5)::before { content: "Buy/Sell"; }
                  th:nth-child(6)::before { content: "Stop Loss"; }
                  th:nth-child(7)::before { content: "Remarks"; }
                  th:nth-child(8)::before { content: "Order Type"; }

                  td:nth-child(1)::before { content: "Sl No"; }
                  td:nth-child(2)::before { content: "Script/Contract Name"; }
                  td:nth-child(3)::before { content: "Qty"; }
                  td:nth-child(4)::before { content: "Rate"; }
                  td:nth-child(5)::before { content: "Buy/Sell"; }
                  td:nth-child(6)::before { content: "Stop Loss"; }
                  td:nth-child(7)::before { content: "Remarks"; }
                  td:nth-child(8)::before { content: "Order Type"; }

                  /* Adjust print button for mobile */
                  .print-btn {
                      flex-direction: column;
                  }
                  .print-btn button {
                      width: 100%;
                  }
              }

              /* Ensure the table scrolls horizontally on smaller devices */
              @media (max-width: 480px) {
                  table {
                      display: block;
                      overflow-x: auto;
                      white-space: nowrap;
                  }
                  th, td {
                      white-space: normal;
                      display: table-cell;
                      padding: 10px;
                  }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h2 class="center-text">ORDER SHEET</h2>
              <table>
                  <tr>
                      <td><strong>Client Name:</strong> ${form.userName}</td>
                      <td><strong>CCL ID:</strong> ${form.cclId}</td>
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
                          <th>Stop Loss</th>
                          <th>Remarks</th>
                          <th>Order Type</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>1</td>
                          <td>${form.stockName}</td>
                          <td>${form.quantity}</td>
                          <td>${form.rate}</td>
                          <td>${form.buyOrSell}</td>
                          <td>${form.stopLoss || 'N/A'}</td>
                          <td>${form.remarks || 'None'}</td>
                          <td>${form.orderType}</td>
                      </tr>
                  </tbody>
              </table>
              <p>The above details are confirmed by me.</p>
              <div class="signature">
                  <p><strong>Client's Full Signature: ${form.userName}</strong></p>
              </div>
              <div class="footer center-text">
                  <p><strong>MAYUR P. JAIN</strong></p>
                  <p class="small-text">C/O. BHAIDAS MAGANLAL & CO.<br>SHARE & STOCK BROKER<br>5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER, BOMBAY SAMACHAR MARG, MUMBAI - 400 023</p>
              </div>
              <div class="print-btn">
                  <button onclick="window.print()">Print Order Sheet</button>
              </div>
          </div>
      </body>
      </html>
      `,
    });

    console.log('Order confirmation email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = { sendOrderConfirmation };
