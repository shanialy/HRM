export const emailTemplateGeneric = (
  subject: string,
  role: "Employee" | "User",
  email: string,
  password: string,
) => {
  const description =
    role === "Employee"
      ? `You have been successfully added as an <strong>Employee</strong> at Teck Solution Hub. You can now login and start managing your tasks efficiently. For security purposes, please change your password after logging in.`
      : `You have been successfully added as a <strong>Client</strong>. You can now login and access your account to view your tasks, messages, and updates. For security purposes, please change your password after logging in.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    color: #333;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .header {
    background-color: #d32f2f; /* 🔥 CHANGED (Blue → Red) */
    color: #fff;
    padding: 20px;
    text-align: center;
    font-size: 22px;
    font-weight: bold;
  }
  .content {
    padding: 30px 25px;
    font-size: 16px;
    line-height: 1.6;
  }
  .content p {
    margin: 15px 0;
  }
  .credentials {
    background-color: #f0f4ff;
    padding: 15px;
    border-radius: 5px;
    margin: 20px 0;
    font-family: monospace;
  }
  .credentials p {
    margin: 5px 0;
  }
  .cta-button {
    display: inline-block;
    background-color: #d32f2f; /* 🔥 CHANGED (Blue → Red) */
    color: #fff;
    padding: 12px 25px;
    border-radius: 5px;
    text-decoration: none;
    font-weight: bold;
    margin-top: 15px;
  }
  .footer {
    font-size: 14px;
    color: #888;
    text-align: center;
    padding: 15px 10px;
  }
  @media screen and (max-width: 620px) {
    .container { margin: 20px 10px; }
    .content { padding: 20px 15px; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">${subject}</div>
    <div class="content">
      <p>Dear ${role},</p>
      <p>${description}</p>

      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
      </div>

      <p>Click the button below to login:</p>
      <a href="https://tecksolutionhub-hrm.netlify.app" class="cta-button">Login to TSH</a>

      <p>If you did not expect this email, please ignore it.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Teck Solution Hub. All rights reserved.<br>
      <a href="https://tecksolutionhub.com" style="color:#d32f2f;text-decoration:none;">https://tecksolutionhub.com</a>
    </div>
  </div>
</body>
</html>

  `;
};

export const otpTemplate = (subject: string, role: string, otp: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f6f8;
    color: #333;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .header {
    background-color: #d32f2f;
    color: #fff;
    padding: 20px;
    text-align: center;
    font-size: 22px;
    font-weight: bold;
  }
  .content {
    padding: 30px 25px;
    font-size: 16px;
    line-height: 1.6;
    text-align: center;
  }
  .otp-box {
    background-color: #f0f4ff;
    padding: 20px;
    border-radius: 8px;
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 4px;
    margin: 25px 0;
    color: #d32f2f;
  }
  .footer {
    font-size: 14px;
    color: #888;
    text-align: center;
    padding: 15px 10px;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">${subject}</div>
    <div class="content">
      <p>Dear ${role},</p>
      <p>We received a request to reset your password.</p>
      <p>Please use the OTP below to continue:</p>

      <div class="otp-box">${otp}</div>

      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Teck Solution Hub. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};
