// Nodemailer Configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

const sendOrderConfirmation = async (form) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: '"Parsh Jain" <parshjain@example.com>',
      to: 'parshjain46@gmail.com, cpjain1980@gmail.com',
      subject: `Order Confirmation: ${form.stockName}`,
      text: `Hello, Your order for ${form.stockName} has been placed successfully.`,
      html: `
        <html>
        <body>
          <div style="text-align: center;">
            <h2>Order Confirmation</h2>
            <p>Your order for ${form.stockName} has been placed successfully.</p>
            <a href="https://stock-backend-8tvyprseh-parshs-projects.vercel.app/backend/printOrder?userName=${form.userName}&UCC_CODE=${form.UCC_CODE}&currentDate=${form.currentDate}&orderTime=${form.orderTime}&stockName=${form.stockName}&quantity=${form.quantity}&rate=${form.rate}&buyOrSell=${form.buyOrSell}&stopLoss=${form.stopLoss}&orderType=${form.orderType}&remarks=${form.remarks}">
              <button style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer;">Print Order Sheet</button>
            </a>
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
