const nodemailer = require('nodemailer');

(async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.SMTP_TEST_TO || user;

  if (!host || !user || !pass) {
    console.error('Missing SMTP envs. Please set SMTP_HOST, SMTP_USER, SMTP_PASS');
    process.exit(2);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified');

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'GladPros SMTP test',
      text: `Test email from GladPros at ${new Date().toISOString()}`
    });

    console.log('sendMail ok:', info && info.messageId ? info.messageId : info);
    process.exit(0);
  } catch (err) {
    console.error('SMTP test failed:', err && err.message ? err.message : err);
    if (err && err.response) console.error('SMTP response:', err.response);
    process.exit(1);
  }
})();
