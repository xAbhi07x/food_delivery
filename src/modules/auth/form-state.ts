export type OtpFormState = {
  step: "phone" | "code";
  // Normalised E.164 number, kept between the two steps.
  phone?: string;
  error?: string;
  notice?: string;
};

export type PasswordFormState = {
  error?: string;
};
