export interface E2ECredentials {
  email: string;
  password: string;
}

export function getE2ECredentials(): E2ECredentials {
  const email = process.env.MOBILE_E2E_EMAIL;
  const password = process.env.MOBILE_E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Missing MOBILE_E2E_EMAIL or MOBILE_E2E_PASSWORD environment variables for Detox tests.",
    );
  }
  return { email, password };
}
