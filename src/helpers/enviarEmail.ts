import nodemailer from "nodemailer";

export const enviarEmail = async (opciones: { email: string; asunto: string; mensaje: string }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // o tu servidor SMTP
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER, // tu correo
      pass: process.env.EMAIL_PASS, // tu contraseña o app password
    },
  });

  await transporter.sendMail({
    from: `"Soporte Moogold" <${process.env.EMAIL_USER}>`,
    to: opciones.email,
    subject: opciones.asunto,
    html: opciones.mensaje,
  });
};
