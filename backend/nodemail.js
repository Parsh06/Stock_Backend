require('dotenv').config();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');

const sendOrderConfirmation = async (form) => {
  try {
    // Enhanced validation for required fields based on frontend requirements
    const requiredFields = [
      'userName', 'UCC_CODE', 'stockName', 'quantity',
      'rate', 'buyOrSell', 'currentDate', 'orderTime'
    ];

    const missingFields = requiredFields.filter(field => !form[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format if provided
    if (form.userEmail && !/\S+@\S+\.\S+/.test(form.userEmail)) {
      throw new Error('Invalid email format provided');
    }

    // Validate numeric fields
    if (isNaN(form.quantity) || form.quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    if (isNaN(form.rate) || form.rate <= 0) {
      throw new Error('Rate must be a positive number');
    }

    // Validate transaction type
    if (!['BUY', 'SELL', 'Buy', 'Sell'].includes(form.buyOrSell)) {
      throw new Error('Invalid transaction type. Must be BUY or SELL');
    }

    // Enhanced sanitization and validation
    const sanitizedForm = {
      ...form,
      // Clean and validate string fields
      stockName: (form.stockName || '').toString().replace(/[<>]/g, '').trim(),
      userName: (form.userName || '').toString().replace(/[<>]/g, '').trim(),
      UCC_CODE: (form.UCC_CODE || '').toString().replace(/[<>]/g, '').trim(),
      userEmail: (form.userEmail || '').toString().trim(),

      // Ensure numeric fields are properly converted
      quantity: Math.floor(parseFloat(form.quantity)) || 0,
      rate: parseFloat(form.rate) || 0,

      // Handle optional numeric fields
      stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
      orderAmount: form.orderAmount ? parseFloat(form.orderAmount) : null,

      // Normalize transaction type
      buyOrSell: form.buyOrSell.toUpperCase(),

      // Clean optional text fields
      orderType: (form.orderType || 'Market').toString().trim(),
      remarks: (form.remarks || '').toString().replace(/[<>]/g, '').trim(),

      // Format dates properly
      currentDate: form.currentDate || new Date().toLocaleDateString('en-GB'),
      orderTime: form.orderTime || new Date().toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      }),

      // Calculate order amount if not provided
      calculatedAmount: (parseFloat(form.quantity) || 0) * (parseFloat(form.rate) || 0),

      // Add timestamp for tracking
      timestamp: form.timestamp || new Date().toISOString(),
    };

    // Final validation checks
    if (!sanitizedForm.stockName) {
      throw new Error('Stock name cannot be empty');
    }

    if (!sanitizedForm.userName) {
      throw new Error('User name cannot be empty');
    }

    if (!sanitizedForm.UCC_CODE) {
      throw new Error('UCC Code cannot be empty');
    }

    // Calculate final order amount
    const finalOrderAmount = sanitizedForm.orderAmount || sanitizedForm.calculatedAmount;

    console.log('📄 Starting premium PDF generation...');
    console.log('🎨 Form data received:', {
      userName: sanitizedForm.userName,
      stockName: sanitizedForm.stockName,
      buyOrSell: sanitizedForm.buyOrSell,
      quantity: sanitizedForm.quantity,
      rate: sanitizedForm.rate
    });

    // Create a professionally styled PDF document with enhanced features
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      bufferPages: true,
      font: 'Helvetica',
      info: {
        Title: `Order Confirmation - ${sanitizedForm.stockName}`,
        Author: 'Mayur P. Jain Stock Broker',
        Subject: `${sanitizedForm.buyOrSell} Order for ${sanitizedForm.userName}`,
        Keywords: 'Stock Order, Confirmation, Trading',
        Creator: 'Smart Trading Hub',
        Producer: 'NodeJS PDFKit'
      }
    });
    const pdfBuffer = new streamBuffers.WritableStreamBuffer();
    doc.pipe(pdfBuffer);

    console.log('📊 PDF Document initialized with premium styling features...');

    // Enhanced color scheme and styling with validation
    const primaryColor = '#1A365D';      // Deep navy blue
    const accentColor = '#3182CE';       // Bright blue
    const successColor = '#38A169';      // Professional green for BUY
    const dangerColor = '#E53E3E';       // Professional red for SELL
    const goldColor = '#D69E2E';         // Gold accent
    const textColor = '#2D3748';         // Dark gray text
    const lightGray = '#F7FAFC';         // Very light background
    const borderColor = '#E2E8F0';       // Light border
    const actionColor = sanitizedForm.buyOrSell === 'BUY' ? successColor : dangerColor;

    // Helper functions for enhanced styling with error handling
    const drawRoundedRect = (x, y, width, height, radius = 8) => {
      try {
        if (width > 0 && height > 0) {
          doc.roundedRect(x, y, width, height, radius);
        }
      } catch (error) {
        console.warn('DrawRoundedRect error:', error.message);
        doc.rect(x, y, width, height); // Fallback to regular rectangle
      }
    };

    const addShadowEffect = (x, y, width, height, radius = 8) => {
      try {
        // Shadow effect
        doc.save();
        doc.fillColor('#000000').opacity(0.1);
        drawRoundedRect(x + 2, y + 2, width, height, radius);
        doc.fill();
        doc.restore();
      } catch (error) {
        console.warn('Shadow effect error:', error.message);
      }
    };

    const drawGradientHeader = (x, y, width, height) => {
      try {
        // Create gradient-like effect with multiple rectangles
        const steps = 5;
        for (let i = 0; i < steps; i++) {
          const alpha = 1 - (i * 0.1);
          doc.save();
          doc.fillColor(primaryColor).opacity(alpha);
          drawRoundedRect(x, y + (i * 2), width, height - (i * 4), 10 - i);
          doc.fill();
          doc.restore();
        }
      } catch (error) {
        console.warn('Gradient header error:', error.message);
        // Fallback to solid color
        doc.save();
        doc.fillColor(primaryColor);
        drawRoundedRect(x, y, width, height, 10);
        doc.fill();
        doc.restore();
      }
    };

    // Page background with subtle pattern
    console.log('🎨 Applying background styling...');
    doc.save();
    doc.fillColor('#FAFAFA');
    doc.rect(0, 0, doc.page.width, doc.page.height).fill();
    doc.restore();

    // Add watermark/background pattern
    doc.save();
    doc.fillColor('#F0F8FF').opacity(0.3);
    for (let i = 0; i < doc.page.width; i += 40) {
      for (let j = 0; j < doc.page.height; j += 40) {
        doc.circle(i, j, 1).fill();
      }
    }
    doc.restore();
    console.log('✅ Background pattern applied successfully');

    // Enhanced header with premium styling
    console.log('🏢 Creating premium header with gradient effects...');
    const pdfHeaderHeight = 120;
    addShadowEffect(20, 20, doc.page.width - 40, pdfHeaderHeight, 12);
    drawGradientHeader(20, 20, doc.page.width - 40, pdfHeaderHeight);

    // Add decorative border
    doc.save();
    doc.strokeColor(goldColor).lineWidth(3);
    drawRoundedRect(22, 22, doc.page.width - 44, pdfHeaderHeight - 4, 10);
    doc.stroke();
    doc.restore();
    console.log('✅ Premium header with gold border created');

    // Company logo area (simulated with simple design)
    doc.save();
    doc.fillColor('white').opacity(0.9);
    doc.circle(80, 60, 25).fill();
    doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold');
    doc.text('$', 75, 52);
    doc.restore();

    // Company header content with premium typography
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold');
    doc.text('MAYUR P. JAIN', 120, 42, { width: doc.page.width - 140 });

    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('CERTIFIED SHARE & STOCK BROKER', 120, 68, { width: doc.page.width - 140 });

    doc.fontSize(10).fillColor('#E2E8F0').font('Helvetica');
    doc.text('C/O. BHAIDAS MAGANLAL & CO.', 120, 88, { width: doc.page.width - 140 });
    doc.text('SEBI Registered | BSE & NSE Member', 120, 103, { width: doc.page.width - 140 });

    // Contact info in top right with better positioning
    doc.fontSize(9).fillColor('white').font('Helvetica');
    doc.text('Phone: +91-9920326521', doc.page.width - 160, 42, { width: 140, align: 'right' });
    doc.text('Email: mayurinvestments2011', doc.page.width - 160, 55, { width: 140, align: 'right' });
    doc.text("Web: https://stock-62eb3.web.app/", doc.page.width - 160, 68, {
      width: 140,
      align: "right",
    });

    // Reset and position for content
    doc.fillColor(textColor).fontSize(12);
    doc.y = 170;

    // Order reference and timestamp bar
    const refBarY = doc.y;
    addShadowEffect(30, refBarY, doc.page.width - 60, 40, 8);
    doc.save();
    doc.fillColor(actionColor);
    drawRoundedRect(30, refBarY, doc.page.width - 60, 40, 8);
    doc.fill();
    doc.restore();

    const orderRef = `${sanitizedForm.buyOrSell}-${Date.now().toString().slice(-8)}`;
    const actionIcon = sanitizedForm.buyOrSell === 'BUY' ? 'BUY' : 'SELL';

    doc.fillColor('white').fontSize(16).font('Helvetica-Bold');
    doc.text(`${actionIcon} ORDER CONFIRMATION`, 40, refBarY + 8, { width: 300 });

    doc.fontSize(11).font('Helvetica');
    doc.text(`Ref: ${orderRef}`, doc.page.width - 200, refBarY + 8, { width: 160, align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, doc.page.width - 200, refBarY + 23, { width: 160, align: 'right' });

    doc.y = refBarY + 60;

    // Enhanced client information section
    doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold');
    doc.text('CLIENT INFORMATION', 40, doc.y);
    doc.y += 20;

    const infoSectionY = doc.y;
    const leftBoxWidth = (doc.page.width - 80) * 0.55;
    const rightBoxWidth = (doc.page.width - 80) * 0.4;
    const boxHeight = 80;

    // Left info box with enhanced styling
    addShadowEffect(30, infoSectionY, leftBoxWidth, boxHeight, 10);
    doc.save();
    doc.fillColor('#FFFFFF');
    drawRoundedRect(30, infoSectionY, leftBoxWidth, boxHeight, 10);
    doc.fill();
    doc.strokeColor(borderColor).lineWidth(1);
    drawRoundedRect(30, infoSectionY, leftBoxWidth, boxHeight, 10);
    doc.stroke();
    doc.restore();

    // Client details with icons
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold');
    doc.text('Client Details', 45, infoSectionY + 12);

    doc.fillColor(textColor).fontSize(9).font('Helvetica');
    doc.text(`Name: ${sanitizedForm.userName}`, 45, infoSectionY + 28);
    doc.text(`UCC Code: ${sanitizedForm.UCC_CODE}`, 45, infoSectionY + 40);
    doc.text(`Email: ${sanitizedForm.userEmail || 'Not provided'}`, 45, infoSectionY + 52);


    // Right info box
    const rightBoxX = 40 + leftBoxWidth;
    addShadowEffect(rightBoxX, infoSectionY, rightBoxWidth, boxHeight, 10);
    doc.save();
    doc.fillColor('#FFFFFF');
    drawRoundedRect(rightBoxX, infoSectionY, rightBoxWidth, boxHeight, 10);
    doc.fill();
    doc.strokeColor(borderColor).lineWidth(1);
    drawRoundedRect(rightBoxX, infoSectionY, rightBoxWidth, boxHeight, 10);
    doc.stroke();
    doc.restore();

    // Order timing details
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold');
    doc.text('Order Details', rightBoxX + 15, infoSectionY + 12);

    doc.fillColor(textColor).fontSize(9).font('Helvetica');
    doc.text(`Date: ${sanitizedForm.currentDate}`, rightBoxX + 15, infoSectionY + 28);
    doc.text(`Time: ${sanitizedForm.orderTime}`, rightBoxX + 15, infoSectionY + 40);
    doc.text(`Status: CONFIRMED`, rightBoxX + 15, infoSectionY + 52);
    doc.text(`Type: ${sanitizedForm.orderType || 'Market'}`, rightBoxX + 15, infoSectionY + 64);

    doc.y = infoSectionY + boxHeight + 20;

    // Enhanced transaction summary with premium styling
    doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold');
    doc.text('TRANSACTION SUMMARY', 40, doc.y);
    doc.y += 20;

    const summaryY = doc.y;
    const summaryHeight = 60;

    // Multiple layer shadow for depth
    addShadowEffect(30, summaryY, doc.page.width - 60, summaryHeight, 12);
    addShadowEffect(28, summaryY - 2, doc.page.width - 56, summaryHeight, 12);

    // Gradient background for summary
    for (let i = 0; i < 3; i++) {
      doc.save();
      doc.fillColor(actionColor).opacity(0.9 - (i * 0.1));
      drawRoundedRect(30 - i, summaryY - i, doc.page.width - 60 + (i * 2), summaryHeight + (i * 2), 12 + i);
      doc.fill();
      doc.restore();
    }

    // Decorative border
    doc.save();
    doc.strokeColor(goldColor).lineWidth(2);
    drawRoundedRect(32, summaryY + 2, doc.page.width - 64, summaryHeight - 4, 10);
    doc.stroke();
    doc.restore();

    const totalValue = (sanitizedForm.quantity * sanitizedForm.rate).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    doc.fillColor('white').fontSize(16).font('Helvetica-Bold');
    doc.text(`${actionIcon} ORDER EXECUTED`, 0, summaryY + 10, {
      align: 'center',
      width: doc.page.width
    });

    doc.fontSize(12).font('Helvetica');
    doc.text(`${sanitizedForm.quantity} shares of ${sanitizedForm.stockName}`, 0, summaryY + 28, {
      align: 'center',
      width: doc.page.width
    });

    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`@ Rs.${sanitizedForm.rate} = Rs.${totalValue}`, 0, summaryY + 44, {
      align: 'center',
      width: doc.page.width
    });

    doc.y = summaryY + summaryHeight + 20;

    // Premium transaction table with improved two-row layout
    doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold');
    doc.text('DETAILED TRANSACTION RECORD', 40, doc.y);
    doc.y += 20;

    const tableY = doc.y;
    const tableWidth = doc.page.width - 60;

    // First row: Sr, Security Name, Qty, Rate, Action
    const row1ColWidths = [50, 200, 80, 100, 90]; // First row columns
    const row1Headers = ['Sr.', 'Security Name', 'Qty', 'Rate (Rs)', 'Action'];

    // Second row: Stop Loss, Order Type, Total Value, Date, Time
    const row2ColWidths = [130, 130, 150, 110]; // Second row columns
    const row2Headers = ['Stop Loss', 'Order Type', 'Total Value (Rs)', 'Status'];

    const headerHeight = 30;
    const rowHeight = 35;
    const totalTableHeight = (headerHeight + rowHeight) * 2 + 10; // Two table sections

    // Table shadow for entire table
    addShadowEffect(30, tableY, tableWidth, totalTableHeight, 8);

    // FIRST TABLE SECTION
    // Enhanced table header for first row
    doc.save();
    for (let i = 0; i < 3; i++) {
      doc.fillColor(primaryColor).opacity(0.9 - (i * 0.1));
      drawRoundedRect(30 - i, tableY - i, tableWidth + (i * 2), headerHeight + (i * 2), 8 + i);
      doc.fill();
    }
    doc.restore();

    // Header border for first table
    doc.save();
    doc.strokeColor(goldColor).lineWidth(1);
    drawRoundedRect(30, tableY, tableWidth, headerHeight, 8);
    doc.stroke();
    doc.restore();

    // First row headers
    let xPos = 30;
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    row1Headers.forEach((header, i) => {
      doc.text(header, xPos + 5, tableY + 10, {
        width: row1ColWidths[i] - 10,
        align: 'center'
      });
      xPos += row1ColWidths[i];
    });

    // First row data
    const dataRow1Y = tableY + headerHeight;
    doc.save();
    doc.fillColor('#F8FAFC');
    drawRoundedRect(30, dataRow1Y, tableWidth, rowHeight, 8);
    doc.fill();
    doc.strokeColor(borderColor).lineWidth(0.5);
    drawRoundedRect(30, dataRow1Y, tableWidth, rowHeight, 8);
    doc.stroke();
    doc.restore();

    const row1Data = [
      '1',
      sanitizedForm.stockName,
      sanitizedForm.quantity.toString(),
      `Rs.${sanitizedForm.rate.toLocaleString('en-IN')}`,
      sanitizedForm.buyOrSell
    ];

    xPos = 30;
    row1Data.forEach((data, i) => {
      let color = textColor;
      let font = 'Helvetica';
      let fontSize = 9;

      if (i === 4) { // Action column
        color = actionColor;
        font = 'Helvetica-Bold';
        fontSize = 10;
      } else if (i === 1) { // Stock name column
        font = 'Helvetica-Bold';
        fontSize = 8;
      }

      doc.fillColor(color).font(font).fontSize(fontSize);

      // Handle text wrapping for long stock names
      if (i === 1 && data.length > 25) {
        const words = data.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
          if ((currentLine + word).length <= 20) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);

        lines.forEach((line, lineIndex) => {
          doc.text(line, xPos + 5, dataRow1Y + 6 + (lineIndex * 9), {
            width: row1ColWidths[i] - 10,
            align: 'center'
          });
        });
      } else {
        doc.text(data, xPos + 5, dataRow1Y + 12, {
          width: row1ColWidths[i] - 10,
          align: 'center'
        });
      }
      xPos += row1ColWidths[i];
    });

    // First table grid lines
    doc.strokeColor(borderColor).lineWidth(0.5);
    xPos = 30;
    row1ColWidths.forEach((width, index) => {
      if (index > 0) {
        doc.moveTo(xPos, tableY).lineTo(xPos, tableY + headerHeight + rowHeight).stroke();
      }
      xPos += width;
    });
    doc.moveTo(30, tableY + headerHeight).lineTo(30 + tableWidth, tableY + headerHeight).stroke();

    // SECOND TABLE SECTION
    const table2Y = dataRow1Y + rowHeight + 5;

    // Enhanced table header for second row
    doc.save();
    for (let i = 0; i < 3; i++) {
      doc.fillColor(accentColor).opacity(0.9 - (i * 0.1));
      drawRoundedRect(30 - i, table2Y - i, tableWidth + (i * 2), headerHeight + (i * 2), 8 + i);
      doc.fill();
    }
    doc.restore();

    // Header border for second table
    doc.save();
    doc.strokeColor(goldColor).lineWidth(1);
    drawRoundedRect(30, table2Y, tableWidth, headerHeight, 8);
    doc.stroke();
    doc.restore();

    // Second row headers
    xPos = 30;
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    row2Headers.forEach((header, i) => {
      doc.text(header, xPos + 5, table2Y + 10, {
        width: row2ColWidths[i] - 10,
        align: 'center'
      });
      xPos += row2ColWidths[i];
    });

    // Second row data
    const dataRow2Y = table2Y + headerHeight;
    doc.save();
    doc.fillColor('#F0F8FF');
    drawRoundedRect(30, dataRow2Y, tableWidth, rowHeight, 8);
    doc.fill();
    doc.strokeColor(borderColor).lineWidth(0.5);
    drawRoundedRect(30, dataRow2Y, tableWidth, rowHeight, 8);
    doc.stroke();
    doc.restore();

    const row2Data = [
      sanitizedForm.stopLoss ? `Rs.${sanitizedForm.stopLoss.toLocaleString('en-IN')}` : 'N/A',
      sanitizedForm.orderType || 'Market',
      `Rs.${totalValue}`,
      'CONFIRMED'
    ];

    xPos = 30;
    row2Data.forEach((data, i) => {
      let color = textColor;
      let font = 'Helvetica';
      let fontSize = 9;

      if (i === 2) { // Total Value column
        color = primaryColor;
        font = 'Helvetica-Bold';
        fontSize = 10;
      } else if (i === 3) { // Status column
        color = successColor;
        font = 'Helvetica-Bold';
        fontSize = 9;
      }

      doc.fillColor(color).font(font).fontSize(fontSize);
      doc.text(data, xPos + 5, dataRow2Y + 12, {
        width: row2ColWidths[i] - 10,
        align: 'center'
      });
      xPos += row2ColWidths[i];
    });

    // Second table grid lines
    doc.strokeColor(borderColor).lineWidth(0.5);
    xPos = 30;
    row2ColWidths.forEach((width, index) => {
      if (index > 0) {
        doc.moveTo(xPos, table2Y).lineTo(xPos, table2Y + headerHeight + rowHeight).stroke();
      }
      xPos += width;
    });
    doc.moveTo(30, table2Y + headerHeight).lineTo(30 + tableWidth, table2Y + headerHeight).stroke();

    doc.y = dataRow2Y + rowHeight + 20;    // Enhanced remarks section
    if (sanitizedForm.remarks) {
      doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold');
      doc.text('SPECIAL INSTRUCTIONS', 40, doc.y);
      doc.y += 15;

      addShadowEffect(30, doc.y, doc.page.width - 60, 35, 8);
      doc.save();
      doc.fillColor('#FFF8DC');
      drawRoundedRect(30, doc.y, doc.page.width - 60, 35, 8);
      doc.fill();
      doc.strokeColor('#DAA520').lineWidth(1);
      drawRoundedRect(30, doc.y, doc.page.width - 60, 35, 8);
      doc.stroke();
      doc.restore();

      doc.fillColor('#8B4513').fontSize(10).font('Helvetica');
      doc.text(sanitizedForm.remarks, 45, doc.y + 12, {
        width: doc.page.width - 90,
        align: 'left'
      });

      doc.y += 50;
    }  // Skip Terms & Conditions section - removed as requested
    doc.y += 10;



    // Premium signature section - Increased height for better fit
    const sigY = doc.y;
    const sigHeight = 90; // Increased height from 70 to 90
    addShadowEffect(30, sigY, doc.page.width - 60, sigHeight, 12);

    // Multi-layer signature box
    doc.save();
    doc.fillColor('#FFFEF7');
    drawRoundedRect(30, sigY, doc.page.width - 60, sigHeight, 12);
    doc.fill();

    // Decorative dashed border
    doc.strokeColor(goldColor).lineWidth(2).dash(8, { space: 4 });
    drawRoundedRect(35, sigY + 5, doc.page.width - 70, sigHeight - 10, 8);
    doc.stroke();
    doc.undash(); // Reset dash pattern
    doc.restore();

    // Signature content with proper spacing
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold');
    doc.text('CLIENT ACKNOWLEDGMENT & DIGITAL SIGNATURE', 0, sigY + 18, {
      align: 'center',
      width: doc.page.width
    });

    doc.fillColor(textColor).fontSize(9).font('Helvetica');
    doc.text('I hereby acknowledge receipt and acceptance of the above order details', 0, sigY + 38, {
      align: 'center',
      width: doc.page.width
    });

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`${sanitizedForm.userName}`, 0, sigY + 58, {
      align: 'center',
      width: doc.page.width
    });

    doc.fontSize(7).font('Helvetica');
    doc.text(`Digital Signature | UCC: ${sanitizedForm.UCC_CODE} | ${new Date().toLocaleDateString('en-IN')}`, 0, sigY + 76, {
      align: 'center',
      width: doc.page.width
    });


    // Simple footer separator line
    doc.strokeColor(primaryColor).lineWidth(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.y += 8;



    console.log('🎯 Finalizing premium PDF with all styling elements...');
    doc.end();
    console.log('✅ PDF generation completed successfully');

    // Wait for PDF generation to complete
    const pdfData = await new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timeout'));
      }, 30000); // 30 seconds timeout

      pdfBuffer.on('finish', () => {
        clearTimeout(timeout);
        const contents = pdfBuffer.getContents();
        if (!contents || contents.length === 0) {
          reject(new Error('Generated PDF is empty'));
        } else {
          console.log(`✅ PDF generated successfully: ${contents.length} bytes`);
          resolve(contents);
        }
      });

      pdfBuffer.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ PDF buffer error:', error);
        reject(error);
      });
    });

    // Configure nodemailer transporter with enhanced security
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ SMTP Server is ready to send emails');
    } catch (error) {
      console.error('❌ SMTP verification failed:', error.message);
      throw new Error('Email service configuration error');
    }

    // Configure email recipients to ensure both client and business receive emails
    const businessEmails = "mayurinvestments2011@gmail.com";

    // Always send TO business emails as primary recipients
    const recipientEmail = businessEmails;

    // Always include client email in CC if available, otherwise just business emails
    const ccEmails = sanitizedForm.userEmail
      ? `${sanitizedForm.userEmail}, ${businessEmails}`
      : businessEmails;

    // Use client's name in the 'from' field for personalization
    const senderName = sanitizedForm.userName
      ? `${sanitizedForm.userName} via Mayur P. Jain Stock Broker`
      : "Mayur P. Jain - Stock Broker";

    // Generate unique order ID based on timestamp and user details
    const orderId = `ORD-${Date.now()}-${sanitizedForm.UCC_CODE || 'GUEST'}`;

    // Create safe filename by removing special characters and ensuring proper format
    const safeStockName = sanitizedForm.stockName.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 20);
    const safeDate = sanitizedForm.currentDate.replace(/[/\\?%*:|"<>]/g, '-');
    const safeUserName = sanitizedForm.userName.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 15);
    const orderTimestamp = Date.now().toString().slice(-8);

    // Validate PDF data before sending
    if (!pdfData || pdfData.length === 0) {
      throw new Error('Generated PDF is empty or invalid');
    }

    console.log(`📋 PDF Details: Size: ${pdfData.length} bytes, Client: ${sanitizedForm.userName}, Stock: ${sanitizedForm.stockName}`);

    // Send email with PDF attachment and enhanced HTML body
    const emailOptions = {
      from: `"${senderName}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail, // Always business emails as primary recipients
      cc: ccEmails, // Client email + business emails in CC for transparency
      subject: `🔔 Order Confirmation #${orderId.split('-')[1]} - ${sanitizedForm.buyOrSell} ${sanitizedForm.stockName} | ${sanitizedForm.userName}`,
      text: createTextTemplate(sanitizedForm),
      html: createEmailTemplate(sanitizedForm),
      attachments: [
        {
          filename: `Order_Confirmation_${orderTimestamp}_${safeUserName}_${safeStockName}_${safeDate}.pdf`,
          content: pdfData,
          contentType: "application/pdf",
          contentDisposition: 'attachment',
          cid: `order_pdf_${orderTimestamp}` // For potential inline display
        },
      ],
      // Enhanced email options
      priority: 'high',
      headers: {
        'X-Order-ID': orderId,
        'X-Client-Name': sanitizedForm.userName,
        'X-Client-UCC': sanitizedForm.UCC_CODE,
        'X-Stock-Symbol': sanitizedForm.stockName,
        'X-Order-Type': sanitizedForm.buyOrSell,
        'X-Order-Amount': sanitizedForm.orderAmount || (sanitizedForm.quantity * sanitizedForm.rate),
        'X-Transaction-Timestamp': new Date().toISOString(),
        'X-System-Source': 'Smart-Trading-Hub',
        'X-PDF-Size': pdfData.length.toString()
      }
    };

    const info = await transporter.sendMail(emailOptions);

    console.log('✅ Email sent successfully with premium PDF attachment');
    console.log('📧 Message ID: %s', info.messageId);
    console.log('📨 Email sent to: %s', info.envelope.to);
    console.log('📎 PDF Attachment: %s bytes', pdfData.length);

    return {
      success: true,
      messageId: info.messageId,
      recipients: info.envelope.to,
      pdfGenerated: true,
      pdfSize: pdfData.length,
      orderDetails: {
        client: sanitizedForm.userName,
        stock: sanitizedForm.stockName,
        action: sanitizedForm.buyOrSell,
        quantity: sanitizedForm.quantity,
        rate: sanitizedForm.rate,
        totalValue: (sanitizedForm.quantity * sanitizedForm.rate).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error generating PDF or sending email:', error);
    throw new Error('Error generating PDF or sending email.');
  }
};

const createEmailTemplate = (form) => {
  const currentDateTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate total value with proper formatting
  const totalValue = (parseFloat(form.quantity) * parseFloat(form.rate)).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });

  // Dynamic colors and icons based on transaction type
  const actionColor = form.buyOrSell === 'BUY' ? '#27AE60' : '#E74C3C';
  const actionIcon = form.buyOrSell === 'BUY' ? '📈' : '📉';
  const actionBgColor = form.buyOrSell === 'BUY' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)';

  // Generate unique order reference
  const orderRef = `${form.buyOrSell}${Date.now().toString().slice(-6)}`;

  // Format numbers with Indian currency format
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${form.stockName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }

        .email-wrapper {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .header {
          background: linear-gradient(135deg, ${actionColor} 0%, ${actionColor}99 100%);
          color: white;
          padding: 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.05) 10px,
            rgba(255,255,255,0.05) 20px
          );
          animation: move 20s linear infinite;
        }

        @keyframes move {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .header-content {
          position: relative;
          z-index: 2;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          backdrop-filter: blur(10px);
          margin-top: 10px;
        }

        .company-info {
          background: linear-gradient(135deg, #2C3E50 0%, #3498DB 100%);
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 13px;
          line-height: 1.8;
        }

        .company-info strong {
          font-size: 16px;
          display: block;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .content {
          padding: 40px;
          background: #fafbfc;
        }

        .greeting {
          font-size: 20px;
          margin-bottom: 25px;
          color: #2C3E50;
          text-align: center;
        }

        .greeting strong {
          color: ${actionColor};
          font-weight: 700;
        }

        .order-summary {
          background: linear-gradient(135deg, ${actionColor} 0%, ${actionColor}dd 100%);
          color: white;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          box-shadow: 0 8px 25px ${actionColor}40;
        }

        .order-summary h3 {
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .order-summary p {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .order-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .detail-box {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          text-align: center;
        }

        .detail-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .detail-label {
          font-weight: 600;
          color: #7f8c8d;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .detail-value {
          font-size: 18px;
          color: #2C3E50;
          font-weight: 700;
        }

        .main-table {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          margin: 30px 0;
        }

        .table-header {
          background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
          color: white;
          padding: 15px 0;
        }

        .table-header h3 {
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th, td {
          padding: 15px 12px;
          text-align: center;
          border-bottom: 1px solid #ecf0f1;
        }

        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2C3E50;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          font-weight: 500;
        }

        .action-cell {
          font-weight: 700;
          font-size: 16px;
        }

        .total-cell {
          font-size: 16px;
          font-weight: 700;
          color: ${actionColor};
        }

        .additional-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid ${actionColor};
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .info-label {
          font-weight: 600;
          color: #7f8c8d;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .info-value {
          font-size: 16px;
          color: #2C3E50;
          font-weight: 600;
        }

        .remarks-section {
          background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
        }

        .important-notes {
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin: 30px 0;
          border-left: 4px solid #3498db;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .important-notes h4 {
          color: #2C3E50;
          margin-bottom: 15px;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .important-notes ul {
          list-style: none;
          padding-left: 0;
        }

        .important-notes li {
          padding: 8px 0;
          position: relative;
          padding-left: 25px;
          color: #5a6c7d;
        }

        .important-notes li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #27AE60;
          font-weight: bold;
        }

        .signature-section {
          background: white;
          border: 2px dashed #bdc3c7;
          border-radius: 12px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          transition: all 0.3s ease;
        }

        .signature-section:hover {
          border-color: ${actionColor};
          background: ${actionBgColor};
        }

        .signature-title {
          font-weight: 600;
          color: #7f8c8d;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
        }

        .signature-name {
          font-size: 24px;
          font-weight: 700;
          color: #2C3E50;
          margin-bottom: 8px;
        }

        .signature-subtitle {
          font-size: 12px;
          color: #95a5a6;
        }

        .footer {
          background: linear-gradient(135deg, #2C3E50 0%, #34495e 100%);
          color: white;
          padding: 30px;
          text-align: center;
          font-size: 13px;
        }

        .footer-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
        }

        .footer-info {
          margin: 15px 0;
          line-height: 1.8;
        }

        .footer-disclaimer {
          font-size: 11px;
          color: #bdc3c7;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .order-ref-badge {
          background: rgba(255,255,255,0.9);
          color: ${actionColor};
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
          margin-top: 10px;
          display: inline-block;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          body {
            padding: 10px;
          }

          .content {
            padding: 25px;
          }

          .header h1 {
            font-size: 24px;
          }

          .order-details {
            grid-template-columns: 1fr;
          }

          .additional-info {
            grid-template-columns: 1fr;
          }

          table {
            font-size: 12px;
          }

          th, td {
            padding: 10px 8px;
          }

          .detail-value {
            font-size: 16px;
          }

          .signature-name {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 20px;
          }

          .content {
            padding: 20px;
          }

          .order-summary {
            padding: 20px;
          }

          .detail-box {
            padding: 15px;
          }

          th, td {
            padding: 8px 4px;
            font-size: 11px;
          }

          .action-cell, .total-cell {
            font-size: 12px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .content {
            background: #1a1a1a;
          }

          .detail-box, .main-table, .info-card, .important-notes, .signature-section {
            background: #2a2a2a;
            border-color: #404040;
            color: #e0e0e0;
          }

          .detail-value, .info-value, .signature-name {
            color: #ffffff;
          }

          th {
            background: #3a3a3a;
            color: #e0e0e0;
          }

          td {
            color: #d0d0d0;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="header-content">
            <h1>${actionIcon} ORDER CONFIRMATION</h1>
            <div class="status-badge">
              ✅ CONFIRMED & PROCESSED
            </div>
            <div class="order-ref-badge">
              Order Ref: ${orderRef}
            </div>
          </div>
        </div>

        <div class="company-info">
          <strong>MAYUR P. JAIN</strong>
          C/O. BHAIDAS MAGANLAL & CO. | SHARE & STOCK BROKER<br>
          📍 5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER, BOMBAY SAMACHAR MARG, MUMBAI - 400 023<br>
          📍 22-A, JAGJIVAN MANSION, GROUND FLOOR, SHOP NO-2, 2ND FANASWADI, MUMBAI - 400002
        </div>

        <div class="content">
          <div class="greeting">
            Dear <strong>${form.userName}</strong>, 👋
          </div>

          <p style="text-align: center; font-size: 16px; color: #5a6c7d; margin-bottom: 30px;">
            Your stock order has been <strong style="color: ${actionColor};">successfully placed and confirmed</strong>.
            Please find the complete order details below:
          </p>

          <div class="order-summary">
            <h3>${actionIcon} Order Summary</h3>
            <p><strong>${form.buyOrSell}</strong> ${form.quantity} shares of <strong>${form.stockName}</strong> at ${formatCurrency(form.rate)} per share</p>
            <p style="margin-top: 10px; font-size: 20px; font-weight: 800;">
              Total Value: ${formatCurrency(parseFloat(form.quantity) * parseFloat(form.rate))}
            </p>
          </div>

          <div class="order-details">
            <div class="detail-box">
              <div class="detail-label">👤 Client Name</div>
              <div class="detail-value">${form.userName}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">🆔 UCC Code</div>
              <div class="detail-value">${form.UCC_CODE}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">📅 Order Date</div>
              <div class="detail-value">${form.currentDate}</div>
            </div>
            <div class="detail-box">
              <div class="detail-label">⏰ Order Time</div>
              <div class="detail-value">${form.orderTime}</div>
            </div>
          </div>

          <div class="main-table">
            <div class="table-header">
              <h3>📋 Transaction Details</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sl No</th>
                  <th>Script/Contract Name</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Action</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><strong>${form.stockName}</strong></td>
                  <td>${form.quantity}</td>
                  <td>${formatCurrency(form.rate)}</td>
                  <td class="action-cell" style="color: ${actionColor};">${form.buyOrSell}</td>
                  <td class="total-cell">${formatCurrency(parseFloat(form.quantity) * parseFloat(form.rate))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="additional-info">
            <div class="info-card">
              <div class="info-label">🛡️ Stop Loss</div>
              <div class="info-value">${form.stopLoss ? formatCurrency(form.stopLoss) : 'Not Set'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">📊 Order Type</div>
              <div class="info-value">${form.orderType || 'Market Order'}</div>
            </div>
          </div>

          ${form.remarks ? `
          <div class="remarks-section">
            <strong>💬 Remarks:</strong> ${form.remarks}
          </div>
          ` : ''}

          <div class="important-notes">
            <h4>📌 Important Information</h4>
            <ul>
              <li>This is an automated confirmation email. Please retain this for your records.</li>
              <li>A detailed PDF order sheet is attached to this email for official documentation.</li>
              <li>For any queries or concerns, please contact us immediately during business hours.</li>
              <li>Market timings: 9:15 AM to 3:30 PM (Monday to Friday, excluding holidays).</li>
              <li>Settlement will be processed as per exchange guidelines (T+2 basis).</li>
              <li>Please verify all details and contact us if any discrepancies are found.</li>
            </ul>
          </div>

          <div class="signature-section">
            <div class="signature-title">✍️ Client's Digital Acknowledgment</div>
            <div class="signature-name">${form.userName}</div>
            <div class="signature-subtitle">Digital Signature & Order Confirmation</div>
            <div style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
              UCC: ${form.UCC_CODE} | Date: ${form.currentDate} | Time: ${form.orderTime}
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-title">🙏 Thank you for choosing our services!</div>
          <div class="footer-info">
            📧 This email was generated on ${currentDateTime} | Order processed successfully<br>
            <strong>MAYUR P. JAIN</strong> | Share & Stock Broker<br>
            📧 Email: ${process.env.EMAIL_USER} | 📞 Contact: +91-XXXXXXXXXX
          </div>
          <div class="footer-disclaimer">
            ⚠️ This is a system-generated email. Please do not reply to this message.<br>
            For support and queries, please contact us during business hours.<br>
            All transactions are subject to market risks and exchange regulations.<br>
            Order Reference: ${orderRef} | Processed via Smart Trading Hub
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const createTextTemplate = (form) => {
  const totalValue = (parseFloat(form.quantity) * parseFloat(form.rate)).toLocaleString('en-IN');
  const currentDateTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
📊 ORDER CONFIRMATION - MAYUR P. JAIN STOCK BROKER
================================================

Dear ${form.userName},

✅ Your stock order has been SUCCESSFULLY PLACED and CONFIRMED!

📋 ORDER SUMMARY:
${form.buyOrSell} ${form.quantity} shares of ${form.stockName} at ₹${form.rate} per share

👤 CLIENT DETAILS:
• Name: ${form.userName}
• UCC Code: ${form.UCC_CODE}
• Order Date: ${form.currentDate}
• Order Time: ${form.orderTime}

💰 TRANSACTION DETAILS:
• Stock: ${form.stockName}
• Quantity: ${form.quantity} shares
• Rate: ₹${form.rate} per share
• Action: ${form.buyOrSell}
• Total Value: ₹${totalValue}
• Stop Loss: ${form.stopLoss || 'Not Set'}
• Order Type: ${form.orderType || 'Market Order'}
${form.remarks ? `• Remarks: ${form.remarks}` : ''}

📌 IMPORTANT INFORMATION:
• This is an automated confirmation email
• A detailed PDF order sheet is attached
• Please retain this email for your records
• Market timings: 9:15 AM to 3:30 PM (Mon-Fri)
• Settlement: T+2 basis as per exchange guidelines

📞 CONTACT INFORMATION:
MAYUR P. JAIN - Share & Stock Broker
Email: ${process.env.EMAIL_USER}
Contact: +91-XXXXXXXXXX

📍 OFFICE ADDRESSES:
C/O. BHAIDAS MAGANLAL & CO.
5/11, ROTUNDA, 2ND FLOOR, PHIROZE JEEJEEBHOY TOWER
BOMBAY SAMACHAR MARG, MUMBAI - 400 023

22-A, JAGJIVAN MANSION, GROUND FLOOR, SHOP NO-2
2ND FANASWADI, MUMBAI - 400002

✍️ CLIENT ACKNOWLEDGMENT: ${form.userName}

Thank you for choosing our services!

Generated on: ${currentDateTime}
Order ID: ORD-${Date.now()}

⚠️ This is a system-generated email. Please do not reply.
For support, contact us during business hours.
All transactions are subject to market risks.
================================================
  `;
};

module.exports = { sendOrderConfirmation };
