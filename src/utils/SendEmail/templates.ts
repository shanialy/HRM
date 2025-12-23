export const emailTemplateGeneric = (verificationCode: number) => {
  return `<h2>Hi there,</h2>
    ${`<h4>Thank you for using our service. Please use the following code.</h4>`}
    <h1>${verificationCode}</h1>
    <p>If you did not request this, please ignore this email. This Code will expire in 10 minutes</p>
    `;
};

export const purchasedTemplate = (name: string) => {
  return `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #2c7be5;">New Subscription Purchased</h2>
      <p style="font-size: 16px;">
        <strong>${name}</strong> has just purchased a subscription.
      </p>
    </div>`;
};
