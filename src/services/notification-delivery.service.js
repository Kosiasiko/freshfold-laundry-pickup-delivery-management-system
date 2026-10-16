import nodemailer from "nodemailer";

let transporter;

const getEmailTransporter = () => {
    if (transporter) 
        return transporter;

        const {
            SMTP_HOST,
            SMTP_PORT,
            SMTP_USER,
            SMTP_PASS
        } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            throw new Error("SMTP configuration is incomplete.");
        }
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT || 587),
            secure: Number(SMTP_PORT) === 465, // It is true for 465 and false for other ports.
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
        return transporter;
    };

    export const sendEmail = async ({to, title, message}) => {
        const from = process.env.EMAIL_FROM;

        if(!from){
            throw new Error("EMAIL_FROM is not configured.");
        }
        return getEmailTransporter().sendMail({
            from, to, subject: title, text: message,
        });
    };

    export const sendSms = async ({to, message}) => {
        const{
            TERMII_API_KEY,
            TERMII_SENDER_ID,
        } = process.env;

        if(!TERMII_API_KEY || !TERMII_SENDER_ID){
            throw new Error("Termii configuration is incomplete.");
        }
        if(!to){
            throw new Error("Recipient's phone number is required.");
        }
        const response = await fetch(
            "https://v3.api.termii.com/api/sms/send",
            {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    api_key: TERMII_API_KEY,
                    to,
                    from: TERMII_SENDER_ID,
                    sms: message,
                    type: "plain",
                    channel: "generic",
                }),
            });

            if(!response.ok){
                throw new Error(`Termii request failed with HTTP ${response.status}.`);
            }

            const result = await response.json();
            if(result.code && !["ok", "success"].includes(
                String(result.code).toLowerCase()
            )&& Number(result.code) !== 200){
                throw new Error(`Termii did not accept the SMS request.`);
            }

    return result;
};