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

    // Email details with improved HTML structure and styling
    const info = await transporter.sendMail({
      from: '"Parsh Jain" <parshjain@example.com>', // Sender
      to: 'parshjain46@gmail.com, cpjain1980@gmail.com',  // Multiple recipients
      subject: `Order Confirmation: ${form.stockName}`, // Email subject
      text: `Hello, Your order for ${form.stockName} has been placed successfully.`, // Text body
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
          <h2 style="color: #4CAF50; text-align: center;">Order Confirmation</h2>
          <p style="font-size: 18px;">Hello,</p>
          <p style="font-size: 16px;">Your order for <b style="color: #333;">${form.stockName}</b> has been placed successfully.</p>
          <div style="margin-top: 20px;">
            <h3 style="color: #4CAF50; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order Details:</h3>
            <ul style="list-style: none; padding: 0; font-size: 16px;">
              <li style="margin-bottom: 10px;"><b style="color: #333;">User Name:</b> ${form.userName}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Order Type:</b> ${form.orderType}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Quantity:</b> ${form.quantity}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Rate:</b> ${form.rate}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Date:</b> ${form.currentDate}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Order Time:</b> ${form.orderTime}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Buy/Sell:</b> ${form.buyOrSell}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Stop Loss:</b> ${form.stopLoss || 'N/A'}</li>
              <li style="margin-bottom: 10px;"><b style="color: #333;">Remarks:</b> ${form.remarks || 'None'}</li>
            </ul>
          </div>
          <div style="margin-top: 30px; text-align: center; font-size: 14px;">
            <p style="color: #888;">Thank you for your order!</p>
            <p style="color: #888;">Stock Broking Services</p>
          </div>
        </div>
      `,
    });

    console.log('Order confirmation email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = { sendOrderConfirmation };
