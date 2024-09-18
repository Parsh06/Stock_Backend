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
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .container {
            width: 100%;
            max-width: 1000px;
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

        th,
        td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            word-wrap: break-word;
        }

        th {
            background-color: #f5f5f5;
            color: #333;
        }

        .footer {
            text-align: center;
            font-size: 14px;
            margin: 20px 0;
            color: #ff0000;
        }

        .small-text {
            font-size: 12px;
        }

        .signature {
            margin-top: 30px;
        }

        .print-btn {
            margin-top: 20px;
            text-align: center;
        }

        .print-btn button {
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }

        .print-btn button:hover {
            background-color: #45a049;
        }

        /* Print styles */
        @media print {
            body * {
                visibility: hidden;
            }

            .container,
            .container * {
                visibility: visible;
            }

            .container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
            }

            .print-btn {
                display: none;
            }
        }

        /* Desktop Responsive Design */
        @media (min-width: 769px) {
            .container {
                max-width: 800px;
            }

            table {
                table-layout: fixed;
            }

            th:nth-child(8),
            td:nth-child(8),
            th:nth-child(7),
            td:nth-child(7) {
                width: 150px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="footer">
            <p><strong>MAYUR P. JAIN</strong></p>
            <p class="small-text">C/O. BHAIDAS MAGANLAL & CO.<br>SHARE & STOCK BROKER<br>5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER, BOMBAY SAMACHAR MARG, MUMBAI - 400 023</p>
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
