require('dotenv').config();
const nodemailer = require('nodemailer');

const sendOrderConfirmation = async (form) => {
  try {
    // Use app passwords for Gmail (set this in your .env)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // App password from Google
      },
    });

    // Email details
    const info = await transporter.sendMail({
      from: '"Parsh Jain" <parshjain@example.com>', // Sender
      to: 'parshjain46@gmail.com',                 // Receiver email (you can replace this)
      subject: `Order Confirmation: ${form.stockName}`, // Email subject
      text: `Hello, Your order for ${form.stockName} has been placed successfully.`, // Text body
      html: `
        <b>Hello,</b><br>Your order for <b>${form.stockName}</b> has been placed successfully.<br>
        <b>Order Details:</b><br>
        <ul>
          <li><b>User Name:</b> ${form.userName}</li>
          <li><b>Order Type:</b> ${form.orderType}</li>
          <li><b>Quantity:</b> ${form.quantity}</li>
          <li><b>Rate:</b> ${form.rate}</li>
          <li><b>Date:</b> ${form.currentDate}</li>
          <li><b>Order Time:</b> ${form.orderTime}</li>
          <li><b>Buy/Sell:</b> ${form.buyOrSell}</li>
          <li><b>Stop Loss:</b> ${form.stopLoss || 'N/A'}</li>
          <li><b>Remarks:</b> ${form.remarks || 'None'}</li>
        </ul>`,
    });

    console.log('Order confirmation email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = { sendOrderConfirmation };
